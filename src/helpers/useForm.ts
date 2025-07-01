import { SelectChangeEvent } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import isEmpty from "../helpers";

type ValidationErrors<T> = Partial<Record<keyof T, string>>;
type ValidateFn<T, A> = (values: T, appInfo?: A) => ValidationErrors<T>;
type CallbackFn = () => void;
type FormEvent =
  | React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  | SelectChangeEvent<string>;
interface UseFormReturn<T> {
  values: T;
  errors: ValidationErrors<T>;
  setValues: Dispatch<SetStateAction<T>>;
  setErrors: Dispatch<SetStateAction<ValidationErrors<T>>>;
  handleSubmit: () => void;
  handleChange: (e: FormEvent) => void;

  handleDateChange: (
    value: Date | Dayjs | null,
    name: keyof T | string
  ) => void;
}

/**
 * Хук управления формой с валидацией и колбеком по сабмиту
 * @param callback - функция для вызова после успешной валидации
 * @param validate - функция валидации: получает текущие значения и доп. инфо, возвращает объект ошибок
 * @param appInfo - дополнительная информация для валидации (например, countryCode)
 */
function useForm<T extends Record<string, any>, A = any>(
  callback?: CallbackFn,
  validate?: ValidateFn<T, A>,
  appInfo?: A
): UseFormReturn<T> {
  const [values, setValues] = useState<T>({} as T);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEmpty(errors) && isSubmitting && callback) {
      callback();
      setIsSubmitting(false);
    }
  }, [errors, isSubmitting, callback]);

  const handleSubmit = (): void => {
    if (validate) {
      const validationErrors = validate(values, appInfo);
      setErrors(validationErrors);
    }
    setIsSubmitting(true);
  };

  const handleDateChange: UseFormReturn<T>["handleDateChange"] = (
    value,
    name
  ) => {
    const newVal = value && dayjs(value).isValid() ? dayjs(value) : null;
    const newVals = {
      ...values,
      [name]: newVal,
    } as T;
    setValues(newVals);
    if (validate) setErrors(validate(newVals, appInfo));
  };

  const handleChange: UseFormReturn<T>["handleChange"] = (event) => {
    const val = event.target.value;

    const newVals = {
      ...values,
      [event.target.name]: val,
    } as T;

    setValues(newVals);
    if (
      validate &&
      event.target.value != null &&
      values[event.target.name] !== event.target.value
    ) {
      setErrors(validate(newVals, appInfo));
    }
  };

  return {
    values,
    errors,
    setValues,
    setErrors,
    handleSubmit,
    handleChange,
    handleDateChange,
  };
}

export default useForm;
