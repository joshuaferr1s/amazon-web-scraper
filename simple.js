var fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

function sleep() {
  const randomElement = Math.floor(Math.random() * 15);
  return new Promise(resolve => setTimeout(resolve, (15 + randomElement) * 1000));
}

function priceToNumber(price) {
  return Number(price.text().trim().replace(/\$|,/gi, ''));
}

function getDetails(html) {
  const $ = cheerio.load(html);
  const title = $('#productTitle').text().trim();
  const buyBoxPrice = priceToNumber($('#price_inside_buybox'));
  const ourPrice = priceToNumber($('#priceblock_ourprice'));
  const salePrice = priceToNumber($('#priceblock_saleprice'));
  const originalPrice = priceToNumber($('.priceBlockStrikePriceString'));
  if (!title || !(buyBoxPrice || ourPrice || salePrice)) throw new Error('Product may not be available anymore.');
  return {
    pageTitle: title,
    buyBoxPrice,
    ourPrice,
    salePrice,
    originalPrice,
  };
}

async function getPage(url) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:78.0) Gecko/20100101 Firefox/78.0',
    },
  });
  return res.data;
}

(async () => {
  let productDetails = [];
  let failedProducts = [];
  const products = JSON.parse(fs.readFileSync('products.json', 'utf8'));
  console.log(`Maximum time to scrape: ${products.length / 2} minutes`)
  for (let i=0; i<products.length; i++) {
    const product = products[i];
    console.log(`(${i+1}/${products.length}) Fetching: ${product.title}`);
    try {
      const html = await getPage(product.url);
      const details = getDetails(html);
      productDetails.push({ ...product, ...details });
    } catch (error) {
      console.log(`Failed to get: ${product.title}`);
      failedProducts.push({
        title: product.title,
        msg: error.message,
        stack: error.stack,
      });
    }
    await sleep();
  }
  console.log('\n');
  console.log(productDetails);
  console.log(failedProducts);
  console.log('---------------------------')
  console.log(`Succeeded products: ${productDetails.length}`);
  console.log(`Failed products: ${failedProducts.length}`);
})()
