import { isInputError, type ActionError } from "astro:actions";

export function errorMessage(error: ActionError | undefined) {
    if (!error) return undefined;
    if (isInputError(error)) return Object.values(error.fields).flat()[0] ?? "check the form and try again";
    return error.message;
}
