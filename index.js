const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
const Jobs = require('./models/jobs');

(async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  const navigationPromise = page.waitForNavigation()

  await page.goto('https://www.51job.com/')

  await page.setViewport({ width: 1536, height: 718 })

  //search and submit
  await page.waitForSelector('.fltr #kwdselectid')
  await page.type('.fltr #kwdselectid', 'web前端', { delay: 300 })

  await page.waitForSelector('.content > .in > .fltr > .ush > button')
  await page.click('.content > .in > .fltr > .ush > button')

  await navigationPromise

  //more filter
  await page.waitForSelector('body > .dw_wp > .dw_filter > .op > span')
  await page.click('body > .dw_wp > .dw_filter > .op > span')

  //salary filter
  await page.waitForSelector('body > .dw_wp > .dw_filter > #filter_providesalary > .dx')
  await page.click('body > .dw_wp > .dw_filter > #filter_providesalary > .dx')

  await page.waitForSelector('.dw_filter > #multichoices_providesalary > ul > li:nth-child(4) > a')
  await page.click('.dw_filter > #multichoices_providesalary > ul > li:nth-child(4) > a')

  await page.waitForSelector('.dw_filter > #multichoices_providesalary > ul > li:nth-child(5) > a')
  await page.click('.dw_filter > #multichoices_providesalary > ul > li:nth-child(5) > a')

  await page.waitForSelector('#multichoices_providesalary > ul > li:nth-child(6) > a > .check')
  await page.click('#multichoices_providesalary > ul > li:nth-child(6) > a > .check')

  await page.waitForSelector('.dw_wp #submit_providesalary')
  await page.click('.dw_wp #submit_providesalary')

  await navigationPromise

  //workyear filter
  await page.waitForSelector('body > .dw_wp > .dw_filter > #filter_workyear > .dx')
  await page.click('body > .dw_wp > .dw_filter > #filter_workyear > .dx')

  await page.waitForSelector('.dw_filter > #multichoices_workyear > ul > li:nth-child(2) > a')
  await page.click('.dw_filter > #multichoices_workyear > ul > li:nth-child(2) > a')

  await page.waitForSelector('.dw_filter > #multichoices_workyear > ul > li:nth-child(3) > a')
  await page.click('.dw_filter > #multichoices_workyear > ul > li:nth-child(3) > a')

  await page.waitForSelector('.dw_filter > #multichoices_workyear > ul > li:nth-child(4) > a')
  await page.click('.dw_filter > #multichoices_workyear > ul > li:nth-child(4) > a')

  await page.waitForSelector('.dw_wp #submit_workyear')
  await page.click('.dw_wp #submit_workyear')

  await navigationPromise

  await page.waitForSelector('#resultList')
  const allpage = (await page.$eval('#resultList > div.dw_tlc > div:nth-child(4)', node => node.innerText)).replace(/[^0-9]/ig, '')
  const pageNum = Math.ceil(allpage / 50)

  //job list to json-like
  async function toJsonLike() {
    await page.waitForSelector('#resultList')

    const urlList = await page.$$eval('#resultList > div.el > p.t1 > span > a', nodes => nodes.map(node => node.getAttribute('href')))
    const nameList = await page.$$eval('#resultList > div.el > span.t2 > a', nodes => nodes.map(node => node.innerText))
    const positionList = (await page.$$eval('#resultList > div.el > span.t3', nodes => nodes.map(node => node.innerText))).slice(1)
    const salaryList = (await page.$$eval('#resultList > div.el > span.t4', nodes => nodes.map(node => node.innerText))).slice(1)
    const dateList = (await page.$$eval('#resultList > div.el > span.t5', nodes => nodes.map(node => node.innerText))).slice(1)

    let jsonLike = []
    for (let i = 0; i < urlList.length; i++) {
      let job = { url: '', name: '', position: '', salary: '', date: '' }
      job.url = urlList[i]
      job.name = nameList[i]
      job.position = positionList[i]
      job.salary = salaryList[i]
      job.date = dateList[i]
      jsonLike.push(job)
    }
    return jsonLike
  }

  //get all pages
  const baseurl = 'https://search.51job.com/list/090200,000000,0000,00,9,03%252C04%252C05,web%25E5%2589%258D%25E7%25AB%25AF,2,'
  const otherurl = '.html?lang=c&postchannel=0000&workyear=01%2C02%2C03&cotype=99&degreefrom=99&jobterm=99&companysize=99&ord_field=0&dibiaoid=0&line=&welfare='

  async function getAll(pageNum) {
    let all = []
    for (let i = 1; i < pageNum + 1; i++) {
      await page.goto(baseurl + i + otherurl)
      const jobList = await toJsonLike()
      all.push(...jobList)
    }
    console.log(all.length)
    return all
  }

  let allJobs = await getAll(pageNum)

  async function upsertJob(all) {
    for (let jobObj of all) {
      const DB_URL = 'mongodb://localhost/thal';
      if (mongoose.connection.readyState == 0) {
        mongoose.connect(DB_URL);
      }

      // if this name exists, update the entry, don't insert
      const conditions = {
        name: jobObj.name
      };
      const options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      };

      Jobs.findOneAndUpdate(conditions, jobObj, options, (err, result) => {
        if (err) {
          throw err;
        }
      });
    }
  }

  await upsertJob(allJobs);

})()