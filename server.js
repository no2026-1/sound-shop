const express = require('express');
const fs = require('fs');
const path = require('path'); // เพิ่ม path module
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'soundshopsecret',
  resave: false,
  saveUninitialized: true
}));

// middleware: ส่ง cartCount ทุกหน้า
app.use((req, res, next) => {
  res.locals.cartCount = req.session.cart ? req.session.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
  next();
});

// --- ส่วนที่แก้ไข: การโหลดไฟล์ JSON ---
let products = [];
const filePath = path.join(__dirname, 'data', 'products.json');

try {
  const data = fs.readFileSync(filePath, 'utf8');
  products = JSON.parse(data);
  console.log('Successfully loaded products');
} catch (err) {
  console.error('Error loading products.json:', err.message);
  // ป้องกันแอปพังถ้าหาไฟล์ไม่เจอ ให้ products เป็นอาเรย์ว่างไว้ก่อน
  products = [];
}
// ----------------------------------

// หน้าแรก
app.get('/', (req, res) => {
  let filteredProducts = [...products]; // ใช้ spread operator เพื่อไม่ให้กระทบอาเรย์หลัก

  const search = req.query.search;
  const price = req.query.price;
  const category = req.query.category;
  const sort = req.query.sort;

  if(search){
    filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }

  if(price){
    const [min, max] = price.split('-').map(Number);
    filteredProducts = filteredProducts.filter(p => p.price >= min && p.price <= max);
  }

  if(category){
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  if(sort){
    if(sort === 'low') filteredProducts.sort((a,b)=> a.price - b.price);
    if(sort === 'high') filteredProducts.sort((a,b)=> b.price - a.price);
  }

  res.render('index', { products: filteredProducts });
});

// เพิ่มสินค้าในตะกร้า
app.get('/add-to-cart/:id',(req,res)=>{
  const id = parseInt(req.params.id);
  const product = products.find(p=>p.id===id);
  
  if(!product) return res.status(404).send('Product not found');

  if(!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(i=>i.id===id);
  
  if(existing) existing.quantity+=1;
  else req.session.cart.push({...product, quantity:1});
  
  res.redirect('/cart');
});

// Cart
app.get('/cart',(req,res)=>{
  const cart = req.session.cart || [];
  res.render('cart',{ cart });
});

// เพิ่ม / ลดจำนวน
app.get('/increase/:id',(req,res)=>{
  const id = parseInt(req.params.id);
  if(req.session.cart){
    const item = req.session.cart.find(i=>i.id===id);
    if(item) item.quantity +=1;
  }
  res.redirect('/cart');
});

app.get('/decrease/:id',(req,res)=>{
  const id = parseInt(req.params.id);
  if(req.session.cart){
    const item = req.session.cart.find(i=>i.id===id);
    if(item){
      item.quantity -=1;
      if(item.quantity<=0) req.session.cart = req.session.cart.filter(i=>i.id!==id);
    }
  }
  res.redirect('/cart');
});

// ลบสินค้า
app.get('/remove-from-cart/:id',(req,res)=>{
  const id = parseInt(req.params.id);
  if(req.session.cart){
    req.session.cart = req.session.cart.filter(i=>i.id!==id);
  }
  res.redirect('/cart');
});

// Checkout
app.get('/checkout',(req,res)=>{
  const cart = req.session.cart || [];
  res.render('checkout',{ cart });
});

// รับข้อมูล Checkout (POST)
app.post('/checkout',(req,res)=>{
  const { name, address, phone, payment } = req.body;
  const cart = req.session.cart || [];
  const total = cart.reduce((sum,item)=>sum+item.price*item.quantity,0);

  // Clear cart
  req.session.cart = [];

  res.send(`
    <h1>ขอบคุณ ${name} ที่สั่งซื้อ</h1>
    <p>ที่อยู่: ${address}</p>
    <p>เบอร์โทร: ${phone}</p>
    <p>ช่องทางชำระเงิน: ${payment || 'ไม่ได้เลือก'}</p>
    <p>จำนวนสินค้าสั่งซื้อ: ${cart.length}</p>
    <p>ราคารวมทั้งหมด: ${total.toLocaleString()} LAK</p>
    <a href="/">กลับหน้าแรก</a>
  `);
});

// เปลี่ยนจาก:
// console.log(`Server running on http://localhost:${PORT}`)

// เป็นแบบนี้แทน (ตัด localhost ออก หรือเปลี่ยนเป็น 0.0.0.0):
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});