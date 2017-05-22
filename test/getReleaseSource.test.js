import test from 'ava'
import sinon from 'sinon'
import rp from 'request-promise'
import rewire from 'rewire'
import { getReleaseSource } from '../src/utils'
let utils = rewire('../src/utils')
let uri = `${utils.__get__('repoBaseUrl')}/maven-metadata.xml`

test('get maven xml', async t => {
  t.plan(1)
  const res = await rp({
    uri,
    resolveWithFullResponse: true
  })
    .then((response) => {
      // Access response.statusCode, response.body etc.
      return response
    })

  t.is(res.statusCode, 200)
})

test('regex release element from xml', async t => {
  t.plan(1)
  await rp({
    uri
  })
    .then((response) => {
      t.regex(response, new RegExp('<release>(.+)</release>'), 'success')
    })
})

test('release version is string', async t => {
  t.plan(1)
  await rp({
    uri
  })
    .then((response) => {
      let releaseVersion = response.match(new RegExp('<release>(.+)</release>'))[1]
      t.is(typeof releaseVersion, 'string')
    })
})

test('callback is object', async t => {
  t.plan(1)
  await getReleaseSource().then((response) => {
    t.is(typeof response, 'object')
  })
})
