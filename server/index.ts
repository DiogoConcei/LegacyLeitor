require('dotenv').config()
import express from "express"
import multer from "multer"
import cors from "cors"
import qrcode from 'qrcode'
import { Request, Response } from "express";

const app = express()
const port = 5000
const upload = multer()

app.use(cors())

const tempFile: { [key: number]: Express.Multer.File } = {}


app.post("/upload", upload.single('arquivo'), async (req, res) => {
    if (!req.file) {
        await res.status(400).send("Nenhum arquivo enviado")
    }

    const fileId = Date.now()

    if (req.file) {
        tempFile[fileId] = req.file
    }

    const downloadUrl = `http://${process.env.ip}:${port}/download/${fileId}`


    qrcode.toDataURL(downloadUrl, (err, qrCode) => {
        if (err) return res.status(500).send("Erro ao gerar QR Code");

        res.json({ qrCode });
    });

})

app.get("/download/:id", (req: Request, res: Response) => {
    const fileId = Number(req.params.id);
    const file = tempFile[fileId];

    if (!file) {
        res.status(404).send("Arquivo não encontrado");
        return
    }

    res.set({
        "Content-Type": file.mimetype,
        "Content-Disposition": `attachment; filename="${file.originalname}"`,

    })

    res.send(file.buffer);
    delete tempFile[fileId];
});


app.listen(port, () => {
    console.log(`Aplicação rodando na porta: http://192.168.1.4:${port}`)
})


