type ErrorResponseShape = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
};

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!error || typeof error !== 'object') return fallbackMessage;

  const typedError = error as ErrorResponseShape;
  return (
    typedError.response?.data?.error ??
    typedError.response?.data?.message ??
    typedError.message ??
    fallbackMessage
  );
}
