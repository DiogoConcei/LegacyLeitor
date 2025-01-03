import { Comic } from "../types/serie.interfaces";
import { Jimp } from "jimp";
import { FileSystem } from "./abstract/FileSystem";
import StorageManager from "./StorageManager";
import FileOperations from "./FileOperations";
import unzipper from "unzipper";
import fs from "fs";
import jsonfile from "jsonfile";
import path from "path";

export default class ImageOperations extends FileSystem {
  private readonly dataManager: StorageManager;
  private readonly fileManager: FileOperations;

  constructor() {
    super();
    this.dataManager = new StorageManager();
    this.fileManager = new FileOperations();
  }


  private async foundLastDownload(serieName: string): Promise<number> {
    try {
      const serieData = await this.dataManager.selectSerieData(serieName);
      return serieData.metadata.last_download;
    } catch (error) {
      console.error(`Erro ao recuperar o último download da série "${serieName}": ${error}`);
    }
  }

  public async extractChapters(chapterPath: string, quantity: number): Promise<void> {
    try {
      const allChapters = await this.fileManager.foundFiles(chapterPath)
      const organizedChapters = await this.fileManager.orderByChapters(allChapters)

      const serieName = path.basename(chapterPath);

      const serieData = await this.dataManager.selectSerieData(serieName);
      const chapterData = serieData.chapters;

      const seriePath = await this.fileManager.findJsonFile(serieName);
      const lastDownload = await this.foundLastDownload(serieName);

      const nextItem = lastDownload;
      const lastItem = lastDownload + quantity;

      for (let i = nextItem; i < lastItem; ++i) {
        const chapterName = path.basename(organizedChapters[i]);

        const chaptersSeriePath = path.join(
          this.imagesFilesPath,
          serieName,
          chapterName
        );


        fs.mkdirSync(chaptersSeriePath, { recursive: true });

        try {
          await new Promise<void>((resolve, reject) => {
            fs.createReadStream(organizedChapters[i])
              .pipe(unzipper.Extract({ path: chaptersSeriePath }))
              .on("close", resolve)
              .on("error", reject);
          });
          console.log(`Capítulo ${chapterName} extraído com sucesso.`);
        } catch (error) {
          console.error(`Erro ao extrair o capítulo ${chapterName}:`, error);
          throw error;
        }

        chapterData[i].is_dowload = true
        serieData.metadata.last_download = chapterData[i].id

        await jsonfile.writeFile(seriePath, serieData, { spaces: 2 })
      }
    } catch (error) {
      console.error(`Erro ao processar os capítulos em "${chapterPath}": ${error}`);
      throw error;
    }
  }

  public async extractFirstChapter(chapterPath: string): Promise<string> {
    try {
      const chapterName = path.basename(chapterPath);
      const serieName = path.basename(path.dirname(chapterPath));
      const seriePath = await this.fileManager.findJsonFile(serieName)
      let serieData = await this.dataManager.selectSerieData(serieName)

      const chaptersSeriePath = path.join(
        this.imagesFilesPath,
        serieName,
        chapterName
      );

      fs.mkdirSync(chaptersSeriePath, { recursive: true });

      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(chapterPath)
          .pipe(unzipper.Extract({ path: chaptersSeriePath }))
          .on("close", () => {
            resolve();
          })
          .on("error", (error) => {
            console.error(`Erro ao extrair o capítulo ${chapterName}:`, error);
            reject(error);
          });
      });

      serieData.chapters[0].is_dowload = true
      serieData.metadata.last_download = serieData.chapters[0].id

      await jsonfile.writeFile(seriePath, serieData, { spaces: 2 })
      return chaptersSeriePath;
    } catch (error) {
      console.error(`Erro ao processar o capítulo em ${chapterPath}:`, error);
      throw error;
    }
  }

  private async analiseImageSpecial(imagePaths: string[]): Promise<string | null> {
    for (const imagePath of imagePaths) {
      try {
        const image = await Jimp.read(imagePath);

        if ((image.bitmap.width >= 400) || (image.bitmap.height >= 600)) {
          return imagePath;
        }
      } catch (error) {
        console.error(`[ERROR] Erro ao processar a imagem especial ${imagePath}:`, error);
      }
    }
    return null;
  }

  private async analiseImage(imagePaths: string[]): Promise<string[]> {
    console.log(imagePaths);
    const validImagePaths: string[] = [];

    for (const imagePath of imagePaths) {
      try {
        const image = await Jimp.read(imagePath);

        if ((image.bitmap.width <= 1200) && (image.bitmap.height >= 1300)) {
          validImagePaths.push(imagePath);
          break;
        }
      } catch (error) {
        console.error(`[ERROR] Erro ao processar a imagem ${imagePath}:`, error);
      }
    }

    if (validImagePaths.length > 0) {
      return validImagePaths;
    }

    const specialImage = await this.analiseImageSpecial(imagePaths);

    if (specialImage && !validImagePaths.includes(specialImage)) {
      validImagePaths.push(specialImage);
    }

    return validImagePaths;
  }

  private async createCover(imagePath: string): Promise<string> {
    try {

      const dirPath = path.dirname(imagePath);
      const directories = dirPath.split(path.sep);

      const serieName = directories[directories.length - 2];

      const extractchapterName = path.basename(path.dirname(imagePath), path.extname(imagePath));
      const cleanChapterName = path.basename(extractchapterName, path.extname(extractchapterName));

      const uniqueFileName = `${serieName}_${cleanChapterName}_${path.basename(imagePath)}`;

      const destinyDir = path.join(this.showcaseImages, uniqueFileName);

      const fileExists = await fs.promises.stat(imagePath).catch(() => false);
      if (!fileExists) {
        console.error(`[ERROR] Arquivo não encontrado: ${imagePath}`);
        throw new Error(`Arquivo ${imagePath} não encontrado.`);
      }

      await fs.promises.copyFile(imagePath, destinyDir);

      return serieName;

    } catch (e) {
      console.error(`[ERROR] Erro ao criar a capa para a série: ${e.message}`);
      throw e;
    }
  }

  public async coverToSerie(series: Comic[]): Promise<void> {
    try {

      const covers = await this.foundFiles(this.showcaseImages);

      for (const serie of series) {
        let found = false;


        for (const coverPath of covers) {
          const coverName = path.basename(coverPath, path.extname(coverPath));
          const result = coverName.match(/^[^_]+/);


          if (result && serie.name === result[0]) {
            serie.cover_image = coverPath;
            found = true;
            break;
          }
        }

        if (!found) {
        }

        try {
          const filePath = path.join(this.jsonFilesPath, `${serie.name}.json`);
          await jsonfile.writeFile(filePath, serie, { spaces: 2 });
        } catch (error) {
          throw error;
        }
      }


    } catch (error) {
      throw error;
    }
  }

  public async extractInitialCovers(filesName: string[]): Promise<void> {
    try {
      let seriesData: Comic[] = [];
      let chapterImages = [];
      let initialCovers: string[] = [];
      let seriesName: string[] = []

      seriesData = await Promise.all(
        filesName.map(fileName => this.dataManager.selectSerieData(fileName))
      );

      const firstChapterPaths = seriesData.map(
        (serie) => serie.chapters[0].chapter_path
      );

      const extractChapters: string[] = [];

      for (const chapterPath of firstChapterPaths) {
        const extractedChapter = await this.extractFirstChapter(chapterPath);
        extractChapters.push(extractedChapter);
      }

      chapterImages = await Promise.all(extractChapters.map((chapters) => this.foundFiles(chapters)))

      initialCovers = (await Promise.all(
        chapterImages.map(images =>
          this.analiseImage(images))
      )).flat();

      for (const cover of initialCovers) {
        seriesName.push(await this.createCover(cover))
      }

      await this.coverToSerie(seriesData)
    } catch (e) {
      console.error(`Erro encontrado: ${e.message}`);
      throw e;
    }
  }

}
