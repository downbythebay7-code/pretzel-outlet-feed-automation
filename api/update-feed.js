// api/update-feed.js
const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

const CJ_API_KEY = process.env.CJ_API_KEY;
const API_BASE = 'https://api.cjdropshipping.com/api2/Product';
const JSON_FILE = 'products.json';
const CSV_FILE = 'products.csv';

const categories = ['electronics', 'home kitchen', 'beauty', 'health fitness', 'pet supplies', 'baby', 'fashion apparel'];

async function fetchProducts() {
  let allProducts = [];
  for (const category of categories) {
    let page = 1;
    while (true) {
      try {
        const res = await axios.get(`${API_BASE}?access_token=${CJ_API_KEY}&keyword=${encodeURIComponent(category)}&page=${page}&pageSize=50`);
        const items = res.data.data || [];
        if (items.length === 0) break;

        allProducts.push(...items.map(p => ({
          id: p.product_id,
          title: p.title,
          description: p.desc || 'Trendy dropshipping product',
          link: `https://pretzeloutlet.com/product/${p.product_id}`,
          image_link: p.thumb_img || 'https://via.placeholder.com/250',
          price: `${parseFloat(p.price).toFixed(2)} USD`,
          availability: 'in stock',
          brand: 'CJdropshipping',
          product_type: category
        })));

        if (items.length < 50) break;
        page++;
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Error fetching ${category}, page ${page}:`, err.message);
        break;
      }
    }
  }
  return allProducts;
}

async function generateFiles() {
  console.log('Fetching products from CJdropshipping...');
  const products = await fetchProducts();
  console.log(`Fetched ${products.length} products`);

  const jsonData = products.map(p => ({
    product_id: p.id,
    title: p.title,
    price: parseFloat(p.price),
    thumb_img: p.image_link,
    category: p.product_type
  }));
  fs.writeFileSync(JSON_FILE, JSON.stringify(jsonData, null, 2));
  console.log('products.json generated');

  const csvWriter = createObjectCsvWriter({
    path: CSV_FILE,
    header: [
      { id: 'id', title: 'id' },
      { id: 'title', title: 'title' },
      { id: 'description', title: 'description' },
      { id: 'link', title: 'link' },
      { id: 'image_link', title: 'image_link' },
      { id: 'price', title: 'price' },
      { id: 'availability', title: 'availability' },
      { id: 'brand', title: 'brand' },
      { id: 'product_type', title: 'product_type' }
    ]
  });
  await csvWriter.writeRecords(products);
  console.log('products.csv generated');
}

module.exports = async (req, res) => {
  try {
    await generateFiles();
    res.status(200).json({ success: true, message: 'Feed updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
