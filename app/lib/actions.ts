'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {execute} from '@/app/lib/data';
 
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(), // 需要是一个数字类型，但使用了.coerce 方法，这表示 Zod 会尝试将其他类型的值转换成数字
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});
 
const CreateInvoice = FormSchema.omit({ id: true, date: true }); // 排除id 和 date 字段
export async function createInvoice(formData: FormData) {
    // validate the form data
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    try {
      const sql = `
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES ('${customerId}', ${amountInCents}, '${status}', '${date}')
      `;
      await execute(sql);
    } catch (error) {
      return {message:'创建失败'}
    }

    // revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoice(id:string,formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;
  try {
    await execute(`
    UPDATE invoices
    SET customer_id = '${customerId}', amount = ${amountInCents}, status = '${status}'
    WHERE id = '${id}'
  `);
  } catch (error) {
    return {message:'更新失败'}
  }
  
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id:string) {
  throw new Error('Failed to Delete Invoice');
  try {
    await execute(`
    DELETE FROM invoices
    WHERE id = '${id}'
  `);
  } catch (error) {
    return {message:'删除失败'}
  }
  redirect('/dashboard/invoices');
}