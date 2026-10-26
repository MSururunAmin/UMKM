import axios from "axios";

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type ApiErrorDetails = {
  message: string;
  fields: Record<string, string>;
  validationMessages: string[];
};

export function getApiErrorDetails(error: unknown, fallback: string): ApiErrorDetails {
  if (!axios.isAxiosError(error)) {
    return { message: fallback, fields: {}, validationMessages: [] };
  }

  const data = error.response?.data as ApiErrorResponse | undefined;
  const fieldEntries = Object.entries(data?.errors ?? {});
  const fields = Object.fromEntries(
    fieldEntries.flatMap(([field, messages]) =>
      typeof messages[0] === "string" ? [[field, messages[0]]] : [],
    ),
  );
  const validationMessages = fieldEntries.flatMap(([, messages]) =>
    messages.filter((message): message is string => typeof message === "string"),
  );

  return {
    message: data?.message ?? validationMessages[0] ?? fallback,
    fields,
    validationMessages,
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorDetails(error, fallback).message;
}
