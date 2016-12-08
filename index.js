const request = require('needle')
const GitHubApi = require('github')
var moment = require('moment')
// moment().format('mm')
const log = require('winston')
log.level = process.env['NODE_LOG_LEVEL'] || 'info'

const githubAPIToken = process.env['GITHUB_API_TOKEN']
let categorySplitString = '###'

var github = new GitHubApi({
  debug: false,
  protocol: 'https',
  host: 'api.github.com',
  headers: { 'User-Agent': 'sandalsoft/awesome-repodata' },
  // Promise: require('bluebird'),
  // followRedirects: false, // default: true there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
  timeout: 2500
})

github.authenticate({
  type: 'token',
  token: githubAPIToken
})

// info: Rate Limit data: {
// "resources":{"core":{"limit":5000,"remaining":4994,"reset":1481184442},"search":{"limit":30,"remaining":30,"reset":1481182219},"graphql":{"limit":200,"remaining":200,"reset":1481185759}},"rate":{"limit":5000,"remaining":4994,"reset":1481184442},"meta":{"x-ratelimit-limit":"5000","x-ratelimit-remaining":"4994","x-ratelimit-reset":"1481184442","x-oauth-scopes":"notifications, public_repo, read:org, read:repo_hook, repo:status, repo_deployment","x-github-request-id":"49086F56:4B42:4D2F24:58490BCF","status":"200 OK"}}

github.misc.getRateLimit({}, function (err, res) {
  if (err) {
    log.error('Error getting Github Rate Limit')
    log.error(`\t\t${err}`)
  } else {
    log.debug('Ratelimit payload: ' + JSON.stringify(res.resources.core))
    let limit = res.resources.core.limit
    let remaining = res.resources.core.remaining
    let pctLeft = (remaining / limit * 100.00)
    let timeLeft = moment.unix(res.resources.core.reset).fromNow()
    log.info(`Rate Limit info!`)
    log.info(`\t\tLimit: ${limit}`)
    log.info(`\t\tRemaining: ${remaining}`)
    log.info(`\t\t${pctLeft}% left`)
    log.info(`\t\tRests ${timeLeft}`)
  }
})

// let repoOwner = 'ikesyo'
// let repoName = 'Himotoki'
let readmeUrl = 'https://raw.githubusercontent.com/sandalsoft/awesome-repodata/master/test/fixtures/readme_fixture.md'

// INSERT COIN
getReadme(readmeUrl)
.then(readme => {
  let categoryList = parseReadmeIntoCategories(readme)
  categoryList.map(category => {
    let repos = category.split('\n')
    let categoryName = repos[0].replace(/\W/g, '')
    log.debug('CategoryName: ' + categoryName)
    repos.map(repoLine => {
      log.debug(repoLine)
      let repoRe = /^\* \[(.*?)\]\(https:\/\/github\.com\/(.+?)\/(.+?)\)/gmi
      let match = repoRe.exec(repoLine)

      if (match === null) return

      let owner = match[2]
      let repoName = match[3]

      getNumStarsForRepo(owner, repoName)
      .then(numStars => {
        log.debug(`\t\t\t${owner}/${repoName} has ${numStars}`)
      })// then
  .catch(error => log.error(error))
    })// map
  })// map
})// then

/**
 *
 */

function parseReadmeIntoCategories (readme) {
  return readme.split(categorySplitString)
}

function getReadme (readmeUrl) {
  return new Promise(function (resolve, reject) {
    request.get(readmeUrl, function (err, resp) {
      if (err) {
        log.error('Error getting readme from ' + readmeUrl)
        log.error(`\t\t${err}`)
        reject(err)
      } else {
        // console.log('got resp at : ' + resp.body)
        resolve(resp.body)
      }
    })// request
  })// promise
}// getReadme()

function getNumStarsForRepo (repoOwner, repoName) {
  return new Promise(function (resolve, reject) {
    github.activity.getStargazersForRepo({
      owner: repoOwner,
      repo: repoName
    }, function (err, response) {
      if (response !== null || response !== 'undefined') {
        log.debug('RESPONSE: ' + response)
      }
      // if (response.statusCode === 403) {
      //   log.info('Forbidden headers: ' + response.headers)
      // }
      if (err) {
        log.error(`Error getting stars for repo ${repoOwner}/${repoName}`)
        log.error(`\t\t${err}`)
        process.exit(1)
        reject(err)
      } else {
        resolve(response.length)
      }
    })// github.
  })// promise
}// getNumStarsForRepo()

// Blatantly copy-pasta'd from http://machinesaredigging.com/2014/04/27/binary-insert-how-to-keep-an-array-sorted-as-you-insert-data-in-it/
function binaryInsert (value, array, startVal, endVal) {
  var length = array.length
  var start = typeof startVal !== 'undefined' ? startVal : 0
  var end = typeof endVal !== 'undefined' ? endVal : length - 1 // !! endVal could be 0 don't use || syntax
  var m = start + Math.floor((end - start) / 2)

  if (length === 0) {
    array.push(value)
    return
  }

  if (value > array[end]) {
    array.splice(end + 1, 0, value)
    return
  }

  if (value < array[start]) {
    array.splice(start, 0, value)
    return
  }

  if (start >= end) {
    return
  }

  if (value < array[m]) {
    binaryInsert(value, array, start, m - 1)
    return
  }

  if (value > array[m]) {
    binaryInsert(value, array, m + 1, end)
    return
  }

  // we don't insert duplicates
}
