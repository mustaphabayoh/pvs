const { GenericContainer } = require('testcontainers')
const mysql = require('mysql2/promise')

jest.setTimeout(120000)

describe('testcontainers mysql smoke', () => {
  it('starts a mysql container and responds to queries', async () => {
    if (process.env.RUN_TESTCONTAINERS !== '1') {
      return console.warn('Skipping testcontainers integration test (set RUN_TESTCONTAINERS=1 to enable)')
    }
    const container = await new GenericContainer('mysql', '8.0')
      .withEnv('MYSQL_ROOT_PASSWORD', 'rootpass')
      .withEnv('MYSQL_DATABASE', 'integration_test_db')
      .withEnv('MYSQL_USER', 'veruser')
      .withEnv('MYSQL_PASSWORD', 'verpass')
      .withExposedPorts(3306)
      .start()

    const host = container.getHost()
    const port = container.getMappedPort(3306)

    const conn = await mysql.createConnection({ host, port, user: 'veruser', password: 'verpass', database: 'integration_test_db' })
    const [rows] = await conn.query('SELECT 1 as ok')
    await conn.end()

    await container.stop()

    expect(rows[0].ok).toBe(1)
  })
})
