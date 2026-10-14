import "server-only";

import { cache } from "react";
import { getStaffEmail, getStorageUsage, listClients } from "./admin-data";

// A barra lateral aparece duas vezes no HTML (fixa no desktop e na gaveta do
// celular). O cache do React faz cada leitura acontecer uma vez por requisição.
export const shellClients = cache(listClients);
export const shellStorage = cache(getStorageUsage);
export const shellEmail = cache(getStaffEmail);
