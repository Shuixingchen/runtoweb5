import { sql } from '@vercel/postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import mysql from 'mysql2/promise';  // 使用mysql2
import { RowDataPacket, FieldPacket } from 'mysql2';
// 连接到数据库
const client = await mysql.createConnection({
  host     : 'localhost',  // MySQL服务器地址
  port     : 3306,
  user     : 'root',               // 用户名
  password : '123456',           // 密码
  database : 'runtoweb3'        // 数据库名称
});

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const [rows] = await client.execute('SELECT * FROM revenue');
    const data = rows as Revenue[];
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const [rows] = await client.execute(`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`);
    const data = rows as LatestInvoiceRaw[];
    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const [invoiceCountRows]: [RowDataPacket[], FieldPacket[]]  = await  client.execute(`SELECT COUNT(*) as count FROM invoices`);
    const [customerCountRows]: [RowDataPacket[], FieldPacket[]] = await client.execute(`SELECT COUNT(*) as count FROM customers`);
    const [invoiceStatusRows]: [RowDataPacket[], FieldPacket[]] = await client.execute(`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`);
    const numberOfInvoices = invoiceCountRows[0].count;
    const numberOfCustomers = customerCountRows[0].count;
    const totalPaidInvoices = invoiceStatusRows[0].paid;
    const totalPendingInvoices = invoiceStatusRows[0].pending;

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const sql = `
    SELECT
      invoices.id,
      invoices.amount,
      invoices.date,
      invoices.status,
      customers.name,
      customers.email,
      customers.image_url
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE '%${query}%' OR
      customers.email LIKE '%${query}%' OR
      invoices.amount LIKE '%${query}%' OR
      invoices.date LIKE '%${query}%' OR
      invoices.status LIKE '%${query}%'
    ORDER BY invoices.date DESC
    LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
  `
    const [rows] = await client.execute(sql);
    console.log('Fetched invoices:', sql);
    const data = rows as InvoicesTable[];
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const sql =  `SELECT COUNT(*) as count
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE '%${query}%' OR
      customers.email LIKE '%${query}%' OR
      invoices.amount LIKE '%${query}%' OR
      invoices.date LIKE '%${query}%' OR
      invoices.status LIKE '%${query}%'
    `;
    // console.log('Fetching invoices pages:', sql);
    const [invoiceCountRows]: [RowDataPacket[], FieldPacket[]]  = await client.execute(sql);
    const totalPages = Math.ceil(Number(invoiceCountRows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function execute(sql: string){
  try{
    await client.execute(sql);
  }catch(error){
    console.error('Database Error:', error);
    throw new Error('Failed to excute sql: '+sql);
  }
}


export async function fetchInvoiceById(id: string) {
  try {
    const sql= `
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;
    const [rows] = await client.execute(sql);
    const data = rows as InvoiceForm[];
    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const sql = `
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;
    let [rows] = await client.execute(sql);
    const customers = rows as CustomerField[];
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
