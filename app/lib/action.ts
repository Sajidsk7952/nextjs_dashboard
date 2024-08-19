"use server";
import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { error } from "console";
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

export type State = {
  message ? : string | null,
  errors ? : {
    customerId? : string[],
    amount? : string[],
    status? : string[]
  }
}
const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: State,formDara: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formDara.get("customerId"),
    amount: formDara.get("amount"),
    status: formDara.get("status"),
  });
  console.log(validatedFields);
  if(!validatedFields.success){
    return{
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields,failed to create Invoice",
    }
  }
  const {customerId,amount,status} = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];
  try {
    await sql`INSERT INTO invoices (customer_id,amount,status,date) 
    VALUES (${customerId},${amountInCents},${status},${date})`;
  } catch (error: any) {
    console.log(error.message);
    return { message: "Failed to create Invoices" };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string,prevState: State, formData: FormData) {
  const validatedInvoice = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  if(!validatedInvoice.success){
    return{
      errors: validatedInvoice.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice'
    }
  }
  const {amount,customerId,status} = validatedInvoice.data;
  const amountInCents = amount * 100;

  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error: any) {
    console.log(error.message);
    return { message: "Failed to update Invoices" };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  // throw new Error("Failed to delete invoice");
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error: any) {
    console.log(error.message);
    return { message: "Failed to delete Invoice" };
  }
  revalidatePath("/dashboard/invoices");
}
