import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [qrCode, setQrCode] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("arquivo", selectedFile);

    try {
      const response = await axios.post(
        "http://localhost:5000/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setQrCode(response.data.qrCode);
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
    }
  };

  return (
    <div className="outside">
      <div className="inside">
        {qrCode && (
          <div className="qrCode">
            <h2>QR Code Gerado</h2>
            <img src={qrCode} alt="QR Code" />
          </div>
        )}
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <label htmlFor="arquivo">Selecione o arquivo</label>
          <input
            type="file"
            name="arquivo"
            id="arquivo"
            onChange={handleFileChange}
          />
          <div className="formButtons">
            <button type="submit">Enviar</button>
            <button type="reset">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
