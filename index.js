import express from "express";
import puppeteer from "puppeteer";
import fs from "fs";

const app = express();
const PORT = 3000;

let productsList = [];

const scrapeData = async () => {
  let pageNumber = 1;

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  while (pageNumber <= 5) {
    const url = `https://skincarebd.com/product-category/cerave/page/${pageNumber}/`;
    console.log(`Fetching page ${pageNumber}: ${url}`);
    await page.goto(url, { waitUntil: "networkidle0" });

    await page.waitForSelector("li.product");

    const outOfStockProducts = await page.$$eval("li.product", (elements) =>
      elements
        .filter((el) => {
          const soldLabel = el.querySelector("span.mkd-out-of-stock");
          return soldLabel && soldLabel.innerText === "SOLD";
        })
        .map((el) => {
          const productName = el.querySelector(
            "h5.mkd-product-list-title a"
          )?.innerText;
          const productPrice = el
            .querySelector("span.price bdi")
            ?.innerText?.substring(1); // Remove currency symbol
          const productImage = el.querySelector("img")?.src; // Get image source URL

          return {
            name: productName,
            price: productPrice,
            image: productImage,
          };
        })
    );

    if (outOfStockProducts.length > 0) {
      productsList.push(...outOfStockProducts);
    }

    pageNumber++;
  }

  fs.writeFileSync(
    "OutOfStockProducts.json",
    JSON.stringify(productsList, null, 2)
  );
  console.log("Data saved to OutOfStockProducts.json");

  await browser.close();
};

app.get("/scrape", async (req, res) => {
  await scrapeData();
  res.json(productsList);
});

app.get("/get-products", (req, res) => {
  res.json(productsList);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  scrapeData();

  setInterval(scrapeData, 43200000);
});
