import bcrypt from 'bcrypt';
import { db } from '@vercel/postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';
import mysql from 'mysql2/promise';  // 使用mysql2

// 连接到数据库
const client = await mysql.createConnection({
  host     : 'localhost',  // MySQL服务器地址
  port     : 3306,
  user     : 'root',               // 用户名
  password : '123456',           // 密码
  database : 'runtoweb3'        // 数据库名称
});

async function seedUsers() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);
  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return client.execute(
        `INSERT INTO users (name, email, password)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE id=id;`,   // MySQL的INSERT IGNORE语法
        [user.name, user.email, hashedPassword]);
    })
  );
  return insertedUsers;
}

async function seedInvoices() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id VARCHAR(255) NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `);
  const insertedInvoices = await Promise.all(
    invoices.map(async (inv) => {
      return client.execute(
        `INSERT INTO invoices (customer_id, amount, status, date)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id=id;`,   // MySQL的INSERT IGNORE语法
        [inv.customer_id, inv.amount, inv.status, inv.date]);
    })
  );
  return insertedInvoices;
}

async function seedCustomers() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `);
  const insertedCustomers = await Promise.all(
    customers.map(async (customer) => {
      return client.execute(
        `INSERT INTO customers (id, name, email, image_url)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name),email=VALUES(email),image_url=VALUES(image_url);`,
        [customer.id, customer.name, customer.email, customer.image_url]);
    })
  );
  return insertedCustomers;
}

async function seedRevenue() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) PRIMARY KEY,
      revenue INT NOT NULL
    );
  `);
  const insertedRevenue = await Promise.all(
    revenue.map(async (rev) => {
      return client.execute(
        `INSERT INTO revenue (month, revenue)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE revenue=revenue;`,   // MySQL的INSERT IGNORE语法
        [rev.month, rev.revenue]);
    })
  );
  return insertedRevenue;
}

export async function GET() {
  // return Response.json({
  //   message:
  //     'Uncomment this file and remove this line. You can delete this file when you are finished.',
  // });
  try {
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
