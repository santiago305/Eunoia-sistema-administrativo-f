
import { CreateBankAccountDto, BankAccount, BankAccountResponse, BankAccountsResponse, UpdateBankAccountDto, UpdateBankAccountActiveDto, BankAccountActiveResponse } from "@/features/company/types/bankAccounts";
import { normalizeBankAccountNumber } from "@/features/company/utils/bankAccounts";
import axiosInstance from "@/shared/common/utils/axios";
import { API_BANK_ACCOUNTS_GROUP } from "@/shared/services/APIs";


export const createBankAccount = async (
  payload: CreateBankAccountDto,
): Promise<BankAccount> => {
  const response = await axiosInstance.post<BankAccountResponse>(
    API_BANK_ACCOUNTS_GROUP.create,
    {
      ...payload,
      name: payload.name.trim(),
      number: normalizeBankAccountNumber(payload.number),
    },
  );

  return response.data.data;
};

export const listBankAccountsByCompany = async (
  companyId: string,
): Promise<BankAccount[]> => {
  const response = await axiosInstance.get<BankAccountsResponse>(
    API_BANK_ACCOUNTS_GROUP.byCompany(companyId),
  );

  return response.data.data;
};

export const getBankAccountById = async (
  id: string,
): Promise<BankAccount> => {
  const response = await axiosInstance.get<BankAccountResponse>(
    API_BANK_ACCOUNTS_GROUP.byId(id),
  );

  return response.data.data;
};

export const updateBankAccount = async (
  id: string,
  payload: UpdateBankAccountDto,
): Promise<BankAccount> => {
  const body: UpdateBankAccountDto = {};

  if (payload.name !== undefined) {
    body.name = payload.name.trim();
  }

  if (payload.number !== undefined) {
    body.number = normalizeBankAccountNumber(payload.number);
  }

  const response = await axiosInstance.patch<BankAccountResponse>(
    API_BANK_ACCOUNTS_GROUP.update(id),
    body,
  );

  return response.data.data;
};

export const updateBankAccountActive = async (
  id: string,
  payload: UpdateBankAccountActiveDto,
): Promise<BankAccountActiveResponse> => {
  const response = await axiosInstance.patch<BankAccountActiveResponse>(
    API_BANK_ACCOUNTS_GROUP.setActive(id),
    payload,
  );

  return response.data;
};