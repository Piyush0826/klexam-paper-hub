require('dotenv').config()

const app = require('./src/app')
const { connectDatabase } = require('./src/config/db')

const port = Number(process.env.PORT) || 5000

async function startServer() {
	try {
		await connectDatabase()
		app.listen(port, () => {
			console.log(`KLExamPrep backend listening on port ${port}`)
		})
	} catch (error) {
		console.error(`Unable to start KLExamPrep backend: ${error.message}`)
		process.exitCode = 1
	}
}

if (require.main === module) {
	startServer()
}

module.exports = { app, startServer }
