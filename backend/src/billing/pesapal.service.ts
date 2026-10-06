import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface PesapalToken {
  token: string;
  expiresAt: Date;
}

interface SubmitOrderPayload {
  merchantRef: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

interface SubmitOrderResult {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
}

@Injectable()
export class PesapalService {
  private readonly logger = new Logger(PesapalService.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;
  private tokenCache: PesapalToken | null = null;
  private ipnId: string | null = null;

  constructor(private config: ConfigService) {
    const isLive = config.get('PESAPAL_ENV') === 'live';
    this.baseUrl = isLive
      ? 'https://pay.pesapal.com/v3'
      : 'https://cybqa.pesapal.com/pesapalv3';
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10_000,
      headers: { Accept: 'application/json' },
    });
  }

  private async getToken(): Promise<string> {
    if (
      this.tokenCache &&
      this.tokenCache.expiresAt > new Date(Date.now() + 30_000)
    ) {
      return this.tokenCache.token;
    }
    const key = this.config.get<string>('PESAPAL_CONSUMER_KEY');
    const secret = this.config.get<string>('PESAPAL_CONSUMER_SECRET');
    if (!key || !secret) {
      throw new InternalServerErrorException(
        'Pesapal credentials not configured',
      );
    }
    const { data } = await this.http.post(
      '/api/Auth/RequestToken',
      {
        consumer_key: key,
        consumer_secret: secret,
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );

    if (data.status !== '200' || !data.token) {
      this.logger.error('Pesapal authentication failed');
      throw new InternalServerErrorException('Payment provider authentication failed');
    }
    this.tokenCache = {
      token: data.token,
      expiresAt: new Date(data.expiryDate),
    };
    return this.tokenCache.token;
  }

  private authHeaders(token: string) {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async getOrRegisterIpn(): Promise<string> {
    // Prefer a pre-registered IPN ID from env — avoids duplicate registrations on cold starts
    const envIpnId = this.config.get<string>('PESAPAL_IPN_ID');
    if (envIpnId) return envIpnId;

    if (this.ipnId) return this.ipnId;
    const ipnUrl = this.config.get<string>('PESAPAL_IPN_URL');
    if (!ipnUrl)
      throw new InternalServerErrorException('PESAPAL_IPN_URL not configured');
    const token = await this.getToken();
    const { data } = await this.http.post(
      '/api/URLSetup/RegisterIPN',
      {
        url: ipnUrl,
        ipn_notification_type: 'GET',
      },
      { headers: this.authHeaders(token) },
    );
    if (!data.ipn_id) {
      this.logger.error('Pesapal IPN registration failed');
      throw new InternalServerErrorException('Payment notification setup failed');
    }
    this.ipnId = data.ipn_id as string;
    this.logger.log(`Pesapal IPN registered: ${this.ipnId}`);
    return this.ipnId;
  }

  async submitOrder(payload: SubmitOrderPayload): Promise<SubmitOrderResult> {
    const token = await this.getToken();
    const ipnId = await this.getOrRegisterIpn();
    const callbackUrl =
      this.config.get<string>('PESAPAL_CALLBACK_URL') || payload.callbackUrl;

    const body = {
      id: payload.merchantRef,
      currency: payload.currency,
      amount: payload.amount,
      description: payload.description,
      callback_url: callbackUrl,
      cancellation_url: callbackUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: payload.email || '',
        phone_number: payload.phone || '',
        first_name: payload.firstName || 'KampStock',
        last_name: payload.lastName || 'User',
      },
    };

    const { data } = await this.http.post(
      '/api/Transactions/SubmitOrderRequest',
      body,
      {
        headers: this.authHeaders(token),
      },
    );

    if (data.error?.code || !data.redirect_url) {
      this.logger.error('Pesapal order submission failed');
      throw new InternalServerErrorException('Payment order could not be created');
    }

    return {
      orderTrackingId: data.order_tracking_id,
      merchantReference: data.merchant_reference,
      redirectUrl: data.redirect_url,
    };
  }

  async getTransactionStatus(
    orderTrackingId: string,
  ): Promise<{
    status: string;
    paymentMethod: string;
    amount: number;
    confirmationCode: string;
  }> {
    const token = await this.getToken();
    const { data } = await this.http.get(
      `/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: this.authHeaders(token),
      },
    );
    return {
      status: data.payment_status_description || data.status_code || 'UNKNOWN',
      paymentMethod: data.payment_method || '',
      amount: Number(data.amount || 0),
      confirmationCode: data.confirmation_code || '',
    };
  }
}
