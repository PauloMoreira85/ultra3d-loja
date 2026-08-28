export type AsaasBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'

export interface AsaasCustomerInput {
  name: string; cpfCnpj: string; email?: string; phone?: string; mobilePhone?: string
  address?: string; addressNumber?: string; complement?: string; province?: string
  postalCode?: string; externalReference?: string; notificationDisabled?: boolean
}
export interface AsaasCustomer { id: string; name: string; cpfCnpj: string }

export interface AsaasPaymentInput {
  customer: string; billingType: AsaasBillingType; value: number; dueDate: string
  description?: string; externalReference?: string
}
export interface AsaasPayment {
  id: string; status: string; billingType: AsaasBillingType; value: number
  invoiceUrl: string | null; externalReference: string | null
  bankSlipUrl?: string | null       // boleto: PDF
}
export interface AsaasPixQrCode { encodedImage: string; payload: string; expirationDate: string }
export interface AsaasBoletoInfo { identificationField: string; nossoNumero: string; barCode: string } // linha digitável

export interface AsaasWebhookPayload { event: string; payment?: AsaasPayment }
