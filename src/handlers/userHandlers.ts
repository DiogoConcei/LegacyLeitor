import { IpcMain } from "electron";
import { Manga } from "../types/manga.interfaces";
import { Comic } from "../types/comic.interfaces";
import { Book } from "../types/book.interfaces";
import { Literatures } from "../types/series.interfaces";
import UserManager from "../services/UserManager";
import StorageManager from "../services/StorageManager";
import FileManager from "../services/FileManager";
import CollectionsOperations from "../services/CollectionsManager";

export default function userHandlers(ipcMain: IpcMain) {
    const storageOperations = new StorageManager()
    const fileOperations = new FileManager()
    const userOperations = new UserManager()

    ipcMain.handle("rating-serie", async (_event, dataPath: string, userRating: number) => {
        try {
            const serieData = await storageOperations.readSerieData(dataPath)
            const updateData = await userOperations.ratingSerie(serieData, userRating)
            storageOperations.updateSerieData(updateData, serieData.data_path);
            return { success: true };
        } catch (e) {
            console.error(`Falha em ranquear serie: ${e}`)
            return { success: false };
        }
    })

    ipcMain.handle("favorite-serie", async (_event, data_path: string) => {
        try {
            const serieData = await storageOperations.readSerieData(data_path)
            await userOperations.favoriteSerie(serieData)
            return { success: true };
        } catch (e) {
            console.error(`Erro em favoritar serie: ${e}`)
            return { success: false };
        }
    });

    ipcMain.handle("mark-read", async (_event, serieName: string, chapter_id: number) => {
        try {
            const dataPath = await fileOperations.getDataPath(serieName)
            await userOperations.markChapterRead(dataPath, chapter_id)
        } catch (error) {
            console.error(`Falha em marcar como lido: ${error}`);
            throw error;
        }
    });

    ipcMain.handle("return-page", async (_event, serieName: string) => {
        try {
            const dataPath = await fileOperations.getDataPath(serieName)
            const serieData = await storageOperations.readSerieData(dataPath)
            return `/${serieData.literatureForm}/${serieData.name}/${serieData.id}`
        } catch (e) {
            console.error(`Falha em criar url de retorno para pagina individual: ${e}`)
            throw e
        };
    })
}


