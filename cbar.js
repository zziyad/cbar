'use strickt';

const http = require('node:http');
const fs = require('node:fs');
const website = 'https://cbar.az/currency/rates';
const cheerio = require('cheerio');
let url = '';

const type = {
  html: (rates) => {
    const dateHTML = `<h2>Date: ${rates.date}</h2>`;

    const currencyList = Object.keys(rates)
      .filter((key) => key !== 'date')
      .map((key) => `<li>${rates[key]}</li>`);

    return `<div>${dateHTML}<ul>${currencyList.join('')}</ul></div>`;
  },
  xml: (rates) => {
    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlString += '<?xml-stylesheet type="text/css"?>\n';
    xmlString += '<currencyRates>\n';

    // Add the date as an XML element
    xmlString += `<date>${rates.date}</date>\n`;

    // Iterate over each currency rate and add it to the XML string
    for (const currency in rates) {
      if (currency !== 'date') {
        const rate = rates[currency];
        xmlString += `<currency>\n`;
        xmlString += `    <code>${currency}</code>\n`;
        xmlString += `    <value>${rate}</value>\n`;
        xmlString += `</currency>\n`;
      }
    }

    xmlString += '</currencyRates>';
    return xmlString;
  },
  json: (rates) => rates,
};

const main = async (url, timeout) => {
  const currency = {};
  const controller = new AbortController();
  let timer = setTimeout(() => {
    timer = null;
    controller.abort();
    return new Error(`Request aborted from timer for url: ${url}`);
  }, timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status >= 400) {
      throw new Error(`${res.statusText} for url: ${url}`);
    }
    const result = await res.text();

    const $ = cheerio.load(result);
    const date = $('.date-current').attr('data-pmu-date');
    $('.table_items>div').each((i, cur) => {
      const valuta = $(cur).find('.valuta').text();
      const kod = $(cur).find('.kod').text();
      const kurs = $(cur).find('.kurs').text();

      currency[kod] = `${valuta} - ${kurs} AZN`;
    });
    currency.date = date;
    return currency;
  } catch (error) {
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    controller.abort();
  }
};

const routing = {
  '/': '<h1>welcome to homepage</h1><hr>',
  '/rates': async (req, res) => {
    const timeout = 5000;
    try {
      const rates = await main(website, timeout);
      const format = type[url[1]] || type['json'];
      return format(rates);
    } catch (error) {
      throw error;
    }
  },
};

const types = {
  object: (o) => JSON.stringify(o),
  string: (s) => s,
  undefined: () => `requested URL ${url.join('?')} not found`,
  function: async (fn, req, res) => await fn(req, res),
};

const handleServerError = (res, error) => {
  console.error(error);
  res.writeHead(500, {
    'Content-Type': 'text/html',
  });
  res.end('<h1>Internal Server Error</h1>');
};

http
  .createServer(async (req, res) => {
    try {
      req.url.includes('?') ? (url = req.url.split('?')) : (url = [req.url]);
      const data = routing[url[0]];
      const type = typeof data;
      const serializer = types[type];
      let result = await serializer(data, req, res);
      const cType = {
        json: 'application/json; charset=utf-8',
        html: 'text/html; charset=utf-8',
        xml: 'application/xml',
      };
      const contentType = cType[url[1]] || cType['html'];

      res.writeHead(200, {
        'Content-Type': `${contentType}`,
      });
      if (url[1] === 'xml') res.end(result);
      else {
        result = JSON.stringify(result);
        res.end(result);
      }
    } catch (error) {
      handleServerError(res, error);
    }
  })
  .listen(8000);
