const request = require('needle')
const GitHubApi = require('github')
const log = require('winston')
log.level = process.env['NODE_LOG_LEVEL'] || 'info'

let categorySplitString = '###'

var github = new GitHubApi({
  debug: true,
  protocol: 'https',
  host: 'api.github.com',
  headers: { 'User-Agent': 'sandalsoft/awesome-repodata' },
  // Promise: require('bluebird'),
  // followRedirects: false, // default: true there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
  timeout: 2500
})

// let repoOwner = 'ikesyo'
// let repoName = 'Himotoki'
let readmeUrl = 'https://raw.githubusercontent.com/matteocrippa/awesome-swift/master/README.md'

// INSERT COIN
getReadme(readmeUrl).then(readme => {
  let categoryList = parseReadmeIntoCategories(readme)
  categoryList.map(category => {
    let repos = category.split('\n')
    let categoryName = repos[0].replace(/\W/g, '')
    log.debug('CategoryName: ' + categoryName)
    repos.map(repo => {
      // log.debug(repo)
      let repoRe = /^\* \[(.*?)\]\(https:\/\/github\.com\/(.+?)\/(.+?)\)/gmi
      let match = repoRe.exec(repo)

      if (match === null) return

      let owner = match[2]
      let repoName = match[3]

      getNumStarsForRepo(owner, repoName)
      .then(numStars => {
        log.debug(`\t\t\t${owner}/${repoName} has ${numStars}`)
      })// then
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
        reject()
      }
      // console.log('got resp at : ' + resp.body)
      resolve(resp.body)
    })// request
  })// promise
}// getReadme()

function getNumStarsForRepo (repoOwner, repoName) {
  return new Promise(function (resolve, reject) {
    github.activity.getStargazersForRepo({
      owner: repoOwner,
      repo: repoName
    }, function (err, response) {
      if (err) {
        log.error(`Error getting stars for repo ${repoOwner}/${repoName}`)
        reject()
      }
      resolve(response.length)
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
