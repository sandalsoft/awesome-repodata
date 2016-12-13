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
    log.info(`\tLimit: ${limit}`)
    log.info(`\tRemaining: ${remaining}`)
    log.info(`\t${pctLeft}% left`)
    log.info(`\tResets ${timeLeft}`)
  }
})

// let repoOwner = 'ikesyo'
// let repoName = 'Himotoki'
let readmeUrl = 'https://raw.githubusercontent.com/sandalsoft/awesome-repodata/master/test/fixtures/readme_fixture.md'

// INSERT COIN
getReadme(readmeUrl)
.then(readme => {
  let categoryList = parseReadmeIntoCategories(readme)
  var sortedRepos = []

  categoryList.map(category => {
    let projectLines = category.split('\n')
    let categoryName = projectLines[0].replace(/\W/g, '')
    log.debug('CategoryName: ' + categoryName)
    Promise.all(projectLines
      .filter(isRepoLine)
      .map(makeRepoFromLine)
      ).then(unsortedRepos => {
        sortedRepos = sortRepos(unsortedRepos)
        return sortedRepos
      }).then(sortedRepos => {

        sortedRepos.map(repo => log.info(repo.stargazers_count))
        // log.info('finished sorted repos! -> ' + sortedRepos)
      })
  })// categoryListmap

})// then

/**
 * 
 *
 */
function addCategoryToRepo (repo, category) {
  log.info('add: ' + JSON.stringify(repo))
  repo.category = category
  return repo
}

function sortRepos (unsortedRepos) {
  log.info('length: ' + unsortedRepos.length)
  var reposSortedByStars = unsortedRepos.slice(0)
  reposSortedByStars.sort(function (a, b) {
    return a.stargazers_count - b.stargazers_count
  })// sort
  return reposSortedByStars
}
function makeRepoFromLine (repoLine) {
  return new Promise(function (resolve, reject) {
    let owner = extractRepoOwnerName(repoLine)[0]
    let name = extractRepoOwnerName(repoLine)[1]
    // log.info(name)
    getRepo(owner, name)
    .then(repo => {
      log.info('make: ' + repo.full_name)
      resolve(repo)
    })
    .catch(error => reject(error))
  })// promise
}// function

function addRepoToArray(category, repo, theArray) {
  return new Promise(function (resolve, reject) {
    repo.category = category
    // log.info(`${repo.category}: ${repo.full_name} has ${repo.stargazers_count} stars`)
    theArray.push(repo)
    log.info(`inside: ${theArray.length}`)
  })
}

function isRepoLine(line) {
  if (extractRepoOwnerName(line)) { 
    // log.info('y')
    return true
  } else {
    return false
  }
}

function extractRepoOwnerName (repoLine) {
  log.debug(`Parsing owner from repoLine: ${repoLine}`)
  let repoRe = /^\* \[(.*?)\]\(https:\/\/github\.com\/(.+?)\/(.+?)\)/gmi
  let match = repoRe.exec(repoLine)

  if (match === null) return null
  // return [sandalsoft, awesome-reponame]
  return [match[2], match[3]]
}


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

function getRepo (owner, name) {
  log.debug(`Getting stars for ${owner}/${name}`)
  return new Promise(function (resolve, reject) {
    github.repos.get({
      owner: owner,
      repo: name
    }, function (err, response) {
      if (err) {
        log.error(`Error getting stars for repo ${owner}/${name}`)
        log.error(`\t\t${err}`)
        reject(err)
      } else {
        // log.debug('Repo.get Response: ' + JSON.stringify(response))
        resolve(response)
      }
    })// github.
  })// promise
}// getNumStarsForRepo()

function getNumStarsForRepo (repoObj) {
  log.debug(`Getting stars for ${JSON.stringify(repoObj)}`)
  return new Promise(function (resolve, reject) {
    github.repos.get({
      owner: repoObj.owner,
      repo: repoObj.repoName
    }, function (err, response) {
      if (err) {
        log.error(`Error getting stars for repo ${repoObj.owner}/${repoObj.name}`)
        log.error(`\t\t${err}`)
        reject(err)
      } else {
        log.debug('Repo.get Response: ' + JSON.stringify(response))
        repoObj.numStars = response.stargazers_count
        resolve(repoObj.numStars)
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
