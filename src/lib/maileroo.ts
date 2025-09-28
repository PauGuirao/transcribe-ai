interface EmailObject {
  address: string;
  display_name?: string;
}

interface MailerooTemplateRequest {
  from: EmailObject;
  to: EmailObject | EmailObject[];
  subject: string;
  template_id: number;
  template_data?: Record<string, any>;
  tracking?: boolean;
  tags?: Record<string, string>;
  headers?: Record<string, string>;
  reference_id?: string;
}

interface MailerooResponse {
  success: boolean;
  message: string;
  data?: {
    reference_id: string;
  };
}

class MailerooService {
  private apiKey: string;
  private baseUrl = 'https://smtp.maileroo.com/api/v2';
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.apiKey = process.env.MAILEROO_API_KEY!;
    this.fromEmail = process.env.MAILEROO_FROM_EMAIL!;
    this.fromName = process.env.MAILEROO_FROM_NAME || 'TranscribeAI';

    if (!this.apiKey) {
      throw new Error('MAILEROO_API_KEY environment variable is required');
    }
    if (!this.fromEmail) {
      throw new Error('MAILEROO_FROM_EMAIL environment variable is required');
    }
  }

  async sendTemplatedEmail(request: MailerooTemplateRequest): Promise<MailerooResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/emails/template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Maileroo API error:', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(`Maileroo API error: ${response.status} ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Error sending email via Maileroo:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(userEmail: string, userName?: string): Promise<MailerooResponse> {
    const templateId = parseInt(process.env.MAILEROO_WELCOME_TEMPLATE_ID!);
    
    if (!templateId) {
      throw new Error('MAILEROO_WELCOME_TEMPLATE_ID environment variable is required');
    }

    const request: MailerooTemplateRequest = {
      from: {
        address: this.fromEmail,
        display_name: this.fromName,
      },
      to: {
        address: userEmail,
        display_name: userName,
      },
      subject: 'Benvingut a Transcriu! 🎉',
      template_id: templateId,
      template_data: {
        subscriber_name: userName || 'Usuari',
        app_name: 'Transcriu',
        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        support_email: this.fromEmail,
      },
      tracking: true,
      tags: {
        email_type: 'welcome',
        user_type: 'new_user',
      },
      headers: {
        'X-Email-Type': 'welcome',
      },
    };

    return this.sendTemplatedEmail(request);
  }

  async sendInvitationEmail(
    userEmail: string, 
    inviteUrl: string, 
    organizationName: string, 
    inviterName?: string
  ): Promise<MailerooResponse> {
    const templateId = parseInt(process.env.MAILEROO_INVITATION_TEMPLATE_ID!);
    
    if (!templateId) {
      throw new Error('MAILEROO_INVITATION_TEMPLATE_ID environment variable is required');
    }

    const request: MailerooTemplateRequest = {
      from: {
        address: this.fromEmail,
        display_name: this.fromName,
      },
      to: {
        address: userEmail,
      },
      subject: `Invitació per unirte a ${organizationName}`,
      template_id: templateId,
      template_data: {
        organization_name: organizationName,
        inviter_name: inviterName || 'Un membre del equip',
        invite_url: inviteUrl,
        app_name: 'Transcriu',
        support_email: this.fromEmail,
        invitation_button: `<table cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
          <tr>
            <td style="border-radius: 8px; background-color: #2563eb; text-align: center;">
              <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px; font-family: Arial, sans-serif;">
                Acceptar invitació
              </a>
            </td>
          </tr>
        </table>`,
      },
      tracking: true,
      tags: {
        email_type: 'invitation',
        organization: organizationName,
      },
      headers: {
        'X-Email-Type': 'invitation',
      },
    };


    return this.sendTemplatedEmail(request);
  }
}

// Export singleton instance
export const mailerooService = new MailerooService();

// Export types for use in other files
export type { EmailObject, MailerooTemplateRequest, MailerooResponse };