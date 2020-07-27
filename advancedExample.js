var fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const cliProgress = require('cli-progress');

const b1 = new cliProgress.SingleBar({
  format: 'Progress | {bar} | {percentage}% || {value}/{total} Products',
  hideCursor: true,
});

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
  console.log(`Maximum time to scrape: ${products.length / 2} minutes`);
  b1.start(products.length, 0)
  for (const product of products) {
    b1.increment(1);
    try {
      const html = await getPage(product.url);
      const details = getDetails(html);
      productDetails.push({...product, ...details});
    } catch (error) {
      failedProducts.push({
        title: product.title,
        msg: error.message,
        stack: error.stack,
      });
    }
    await sleep();
  }
  b1.stop();
  console.log('\n');

  fs.writeFileSync('output.json', JSON.stringify(productDetails, null, 2));
  fs.writeFileSync('failed.json', JSON.stringify(failedProducts, null, 2));
})()
