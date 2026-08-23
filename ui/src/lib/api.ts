const API_BASE = (window as any).__ENV__?.SQUIDWEAVE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface SendCampaignRequest {
  subject: string;
  body: string;
  to: string[];
  fromName?: string;
  fromEmail?: string;
}

export interface CampaignResult {
  email: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface CampaignHistory {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  recipients: number;
  sent: number;
  results: CampaignResult[];
}

export interface ProspectImportRequest {
  results: any[];
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
  }

  private async fetch(path: string, options?: RequestInit): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // SMTP
  async getSmtp(): Promise<SmtpConfig> {
    return this.fetch('/api/smtp');
  }

  async saveSmtp(config: SmtpConfig): Promise<{ success: boolean }> {
    return this.fetch('/api/smtp', { method: 'POST', body: JSON.stringify(config) });
  }

  async testSmtp(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
    return this.fetch('/api/smtp/test', { method: 'POST', body: JSON.stringify(config) });
  }

  // Campaigns
  async sendCampaign(req: SendCampaignRequest): Promise<{ success: boolean; sent: number; results: CampaignResult[] }> {
    return this.fetch('/api/send-campaign', { method: 'POST', body: JSON.stringify(req) });
  }

  async getCampaignHistory(): Promise<CampaignHistory[]> {
    return this.fetch('/api/campaigns/history');
  }

  // Prospecting
  async importProspects(results: any[]): Promise<{ success: boolean; imported: number; total: number }> {
    return this.fetch('/api/prospecting/import', { method: 'POST', body: JSON.stringify({ results }) });
  }

  // Contacts
  async getContacts(): Promise<any[]> {
    return this.fetch('/api/contacts');
  }

  // Advertising - Organic
  async analyzeSEO(url: string): Promise<any> {
    return this.fetch('/api/seo/analyze', { method: 'POST', body: JSON.stringify({ url }) });
  }

  async schedulePost(post: any): Promise<any> {
    return this.fetch('/api/organic/schedule', { method: 'POST', body: JSON.stringify(post) });
  }

  async getScheduledPosts(): Promise<any[]> {
    return this.fetch('/api/organic/scheduled');
  }

  // Advertising - Ad Platforms
  async connectGoogleAds(credentials: any): Promise<any> {
    return this.fetch('/api/ads/google/connect', { method: 'POST', body: JSON.stringify(credentials) });
  }

  async connectMetaAds(credentials: any): Promise<any> {
    return this.fetch('/api/ads/meta/connect', { method: 'POST', body: JSON.stringify(credentials) });
  }

  async connectLinkedInAds(credentials: any): Promise<any> {
    return this.fetch('/api/ads/linkedin/connect', { method: 'POST', body: JSON.stringify(credentials) });
  }

  async getAdsStatus(): Promise<any> {
    return this.fetch('/api/ads/status');
  }

  async getAdCampaigns(): Promise<any[]> {
    return this.fetch('/api/ads/campaigns');
  }

  async createAdCampaign(campaign: any): Promise<any> {
    return this.fetch('/api/ads/campaigns', { method: 'POST', body: JSON.stringify(campaign) });
  }

  // Advertising - Retargeting
  async getPixels(): Promise<any[]> {
    return this.fetch('/api/retargeting/pixels');
  }

  async createPixel(pixel: any): Promise<any> {
    return this.fetch('/api/retargeting/pixels', { method: 'POST', body: JSON.stringify(pixel) });
  }
}

export const api = new ApiClient();
