const express = require("express")
// 引入spdy来作为http2服务
const spdy = require("spdy")
const path = require("path")
const multer = require("multer")
const cors = require("cors")
const fs = require("fs")
const { static } = require("express")
const app = express()
const PORT = 3000
const UPLOAD_PTAH = path.join(__dirname, "uploads")

if (!fs.existsSync(UPLOAD_PTAH)) {
	fs.mkdirSync(UPLOAD_PTAH)
}

app.use(
	cors({
		origin: "*",
		methods: ["GET", "POST"],
		allowedHeaders: ["Content-Type", "file-name"],
	}),
)

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, UPLOAD_PTAH)
	},
	filename: (req, file, cb) => {
		file.originalname = Buffer.from(file.originalname, "latin1").toString(
			"utf8",
		)
		cb(null, file.originalname)
	},
})

const upload = multer({
	storage,
})

app.post("/upload_file", upload.single("file"), (req, res) => {
	try {
		const file_path = path.join(UPLOAD_PTAH, req.file.originalname)
		const stream = fs.createReadStream(file_path)
		stream.on("error", (err) => {
			console.error("File error:", err)
			res.status(500).send({
				message: "File upload failed!",
				error: err.message,
			})
		})
		stream.on("open", () => {
			console.log("File stream opened:", file_path)
			res.status(200).send({
				message: "File uploaded successfully!",
				file: req.file,
			})
		})

		stream.on("end", () => {
			res.status(200).send({ message: "File uploaded successfully" })
		})
		stream.pipe(res)
	} catch (error) {
		console.error("Upload error:", error)
		res.status(500).send({
			message: "File upload failed!",
			error: error.message,
		})
	}
})

app.post("/upload_stream", (req, res) => {
	const fileName = req.headers["file-name"]
	if (!fileName) {
		return res.status(400).send({ message: "File-Name header is required" })
	}

	const filePath = path.join(
		__dirname,
		"uploads",
		Array.isArray(fileName)
			? fileName.join("")
			: decodeURIComponent(fileName),
	)
	const writeStream = fs.createWriteStream(filePath)

	req.pipe(writeStream)

	req.on("end", () => {
		res.status(200).send({ message: "File uploaded successfully" })
	})

	req.on("error", (err) => {
		console.error("Upload error:", err)
		res.status(500).send({
			message: "File upload failed",
			error: err.message,
		})
	})
})

app.use("/public", static(path.join(__dirname, "uploads")))

spdy.createServer(
	{
		key: fs.readFileSync(
			path.join(__dirname, "certs", "localhost-key.pem"),
		),
		cert: fs.readFileSync(path.join(__dirname, "certs", "localhost.pem")),
	},
	app,
).listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`)
})
