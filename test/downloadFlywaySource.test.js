import test from 'ava'
import sinon from 'sinon'
import rewire from 'rewire'
let utils = rewire('../src/utils')

test('no source arg error', async t => {
  let downloadFlywaySource = sinon.spy(utils.__get__('downloadFlywaySource'))
  const reason = await t.throws(() => { downloadFlywaySource() })
  t.is(reason.toString(), 'Error: Your platform is not supported')
})

test.todo('source.filename exists')
test.todo('source.filename does not exit')
