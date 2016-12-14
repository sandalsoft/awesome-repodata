const request = require('needle')
const GitHubApi = require('github')
const distanceInWordsStrict = require('date-fns/distance_in_words_strict')

const log = require('winston')
log.level = process.env['NODE_LOG_LEVEL'] || 'info'

let SortDirection = {
  Ascending: 'Ascending',
  Descending: 'Descending'
}

let SortProperty = {
  Stars: 'stargazers_count',
  Forks: 'forks',
  LastUpdate: 'updated_at',
  Issues: 'open_issues_count',
  Name: 'name',
  FullName: 'full_name'
}

let sortDirection = SortDirection.Ascending
let sortProperty = SortProperty.Forks

const githubAPIToken = process.env['GITHUB_API_TOKEN']
let categorySplitString = '###'
var github = new GitHubApi({
  debug: false,
  protocol: 'https',
  host: 'api.github.com',
  headers: { 'User-Agent': 'sandalsoft/awesome-repodata' },
  timeout: 5000
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
    let timeLeft = distanceInWordsStrict(new Date(res.resources.core.reset * 1000),
                          new Date(),
                          {unit: 'm'})
    log.info(`Rate Limit info!`)
    log.info(`\tLimit: ${limit}`)
    log.info(`\tRemaining: ${remaining}`)
    log.info(`\t${pctLeft}% left`)
    log.info(`\tResets ${timeLeft}`)
  }
})

let readmeUrl = 'https://raw.githubusercontent.com/sandalsoft/awesome-repodata/master/test/fixtures/readme_fixture.md'

// INSERT COIN
getReadme(readmeUrl)
.then(readme => {
  log.info(`got initial base readme from github`)
  let categoryList = parseReadmeIntoCategories(readme)
  // var sortedRepos = []
  categoryList.map(categoryLines => {
    // The category .name and .repos[] object
    var categoryObj = {}

    let projectLines = categoryLines.split('\n')
    let categoryName = projectLines[0].replace(/\W/g, '')
    categoryObj.name = categoryName // Category = {name: 'Animation', repos: []}

    let repoLines = projectLines.filter(isRepoLine)
    Promise.all(repoLines.map(fetchRepoFromLine))
    // categoryList.map() has returned before Promise.all resolves all repos
    .then(repoList => {
      log.info(`I have all repos now # ${repoList.length}`)
      return new Promise(function (resolve, reject) {
        let unsortedRepos = repoList.map(repo => {
          repo.category = categoryName
          // log.info(repo.category + '\t ' + repo.full_name + ' -->  ' + repo.stargazers_count)
          return repo
        })
        let sortedRepos = sortObjectsBy(unsortedRepos, sortProperty, sortDirection)
        // log.error('repos finished sorting!')
        resolve(sortedRepos)
      })// new Promise
    })// .then(repoList)
    .catch(error => log.error(`error with repoList ${error}`))
    .then(sortedRepos => {
      log.info('1')
      // process.exit(1)
      if (sortedRepos.length < 1) {
        log.info('BROKE ASS >> :' + sortedRepos)
      } else {
        log.info('Category: ' + sortedRepos[0].category)
        sortedRepos.map(repo => {
          log.info('\t ' + repo.full_name + ' --[' + sortProperty + ']->  ' + repo[sortProperty])
        })// sortedRepos.map
      } // else
    })// then()
    .catch(error => log.error(`error with sortedRepos ${error}`))
  })// categoryListmap
})// then

/**
 *
 *
 */

function sortObjectsBy (unsortedObjs, sortProperty, sortDirection) {
  var sortedObjs = []
  if (sortProperty === SortProperty.LastUpdate) {
    sortedObjs = unsortedObjs.slice(0).sort(function (a, b) {
      if (sortDirection === SortDirection.Ascending) {
        return new Date(a[sortProperty]) - new Date(b[sortProperty])
      } else {
        return new Date(b[sortProperty]) - new Date(a[sortProperty])
      }
    })
  } else {
    sortedObjs = unsortedObjs.slice(0).sort(function (a, b) {
      if (sortDirection === SortDirection.Ascending) {
        return a[sortProperty].toString().localeCompare(b[sortProperty].toString(), 'en', {'sensitivity': 'base'})
      } else {
        return b[sortProperty].toString().localeCompare(a[sortProperty].toString(), 'en', {'sensitivity': 'base'})
      }
    })
    return sortedObjs
  }
}

// function sortObjectsBy (unsortedObjs, sortProperty, sortDirection) {
//   let sortFunction = sortProperty === SortProperty.LastUpdate ? dateSortFunction : sortByAlphaNumericProperty
//   if (sortProperty === SortProperty.LastUpdate) {
//     return unsortedObjs.slice(0).sort(function(a,b) {

//     })
//   }
//   // var elvisLives = Math.PI > 4 ? "Yep" : "Nope";
//   let sortedObjs = unsortedObjs.slice(0).sort(sortFunction)
//   return sortedObjs
// }

function sortByAlphaNumericProperty (a, b, sortProperty, sortDirection) {
  // log.info('Alpha sort on: ' + sortProperty)
  if (sortDirection === SortDirection.Ascending) {
    return a[sortProperty].toString().localeCompare(b[sortProperty].toString(), 'en', {'sensitivity': 'base'})
  } else {
    return b[sortProperty].toString().localeCompare(a[sortProperty].toString(), 'en', {'sensitivity': 'base'})
  }
}

function sortByDateProperty (a, b, sortProperty, sortDirection) {
  // log.info('Date sort on: ' + sortProperty)
  if (sortDirection === SortDirection.Ascending) {
    return new Date(a[sortProperty]) - new Date(b[sortProperty])
  } else {
    return new Date(b[sortProperty]) - new Date(a[sortProperty])
  }
}

function fetchRepoFromLine (repoLine) {
  let owner = extractRepoOwnerName(repoLine)[0]
  let name = extractRepoOwnerName(repoLine)[1]
  log.info(`Starting asyc fetch of ${name}`)
  return new Promise(function (resolve, reject) {
    getRepo(owner, name)
    .then(repo => {
      log.info(`resolving: ${repo.full_name}`)
      resolve(repo)
    })
    .catch(error => reject(error))
  })// promise
}// function

function isRepoLine (line) {
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

