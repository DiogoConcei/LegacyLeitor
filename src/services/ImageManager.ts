import { Comic } from "../types/comic.interfaces";
import { Jimp } from "jimp";
import { FileSystem } from "./abstract/FileSystem";
import StorageManager from "./StorageManager";
import FileManager from "./FileManager";
import unzipper from "unzipper";
import fs from "fs";
import fse from "fs/promises";
import jsonfile from "jsonfile";
import path from "path";

export default class ImageManager extends FileSystem {
  private readonly storageManager: StorageManager = new StorageManager()
  private readonly fileManager: FileManager = new FileManager()

  constructor() {
    super();
  }

  private async extractionProcess(chapterSeriePath: string, chapterFile: string): Promise<void> {
    fs.mkdirSync(chapterSeriePath, { recursive: true });

    try {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(chapterFile)
          .pipe(unzipper.Extract({ path: chapterSeriePath }))
          .on("close", resolve)
          .on("error", reject);
      });
    } catch (error) {
      console.error(`Erro ao extrair o capítulo: ${error}`);
      throw error;
    }
  }


  public async encodeImageToBase64(filePath: string[] | string): Promise<string | string[]> {
    try {
      if (typeof filePath === "string") {
        const fileData = await fse.readFile(filePath);
        return fileData.toString("base64");
      } else if (Array.isArray(filePath)) {
        const base64Array = await Promise.all(
          filePath.map(async (filePath) => {
            const fileData = await fse.readFile(filePath);
            return fileData.toString("base64");
          })
        );
        return base64Array;
      } else {
        throw new Error("Entrada inválida. Deve ser um caminho de arquivo ou uma lista de caminhos.");
      }
    } catch (error) {
      console.error("Erro ao processar imagens:", error);
      throw error;
    }
  }

  public async createMangaEdtionById(dataPath: string, chapter_id: number): Promise<string> {
    const serieData = await this.storageManager.readSerieData(dataPath);

    try {
      const chaptersData = serieData.chapters
      let chapter

      for (let chapters of chaptersData) {
        if (chapters.id == chapter_id) {
          chapter = chapters
        }
      }


      if (chapter_id >= chaptersData.length) {
        throw new Error(`ID inválido. deve estar entre 0 e ${chaptersData.length - 1}`)
      }

      const chapterName = path.basename(chapter.archive_path, path.extname(chapter.archive_path));
      const chaptersPath = path.join(this.mangasImages, serieData.name, `${serieData.name} chapters`);
      const chapterSeriePath = path.join(chaptersPath, chapterName);

      await this.extractionProcess(chapterSeriePath, chapter.archive_path);

      chapter.is_dowload = true
      chapter.chapter_path = chapterSeriePath
      serieData.metadata.last_download = chapter_id
      serieData.chapters_path = chaptersPath

      await jsonfile.writeFile(serieData.data_path, serieData, { spaces: 2 });

      return chapterSeriePath;
      return
    } catch (error) {
      console.error(`Erro ao processar o capítulo com ID "${chapter_id}" em "${serieData.name}": ${error}`);
      throw error;
    }
  }

  public async createMangaEdtion(serieName: string, quantity: number): Promise<string> {
    const serieData = await this.storageManager.selectMangaData(serieName);

    try {
      const organizedChapters = await this.fileManager.orderByChapters(
        await this.fileManager.foundFiles(serieData.archives_path)
      );

      const lastDownload = await this.storageManager.foundLastDownload(serieData);
      const firstItem = lastDownload;
      const lastItem = Math.min(lastDownload + quantity, organizedChapters.length);
      const chaptersPath = path.join(this.mangasImages, serieData.name, `${serieData.name} chapters`);
      let lastProcessedPath = "";

      for (let i = firstItem; i < lastItem; ++i) {
        const chapterName = path.basename(organizedChapters[i], path.extname(organizedChapters[i]));
        const chapterSeriePath = path.join(chaptersPath, chapterName);

        await this.extractionProcess(chapterSeriePath, organizedChapters[i]);

        serieData.chapters[i].is_dowload = true;
        serieData.chapters[i].chapter_path = chapterSeriePath;
        serieData.metadata.last_download = i;
        serieData.chapters_path = chaptersPath;

        lastProcessedPath = chapterSeriePath;
      }

      await jsonfile.writeFile(serieData.data_path, serieData, { spaces: 2 });

      return lastProcessedPath;
    } catch (error) {
      console.error(`Erro ao processar os capítulos em "${serieData.name}": ${error} `);
      throw error;
    }
  }

  // É necessário reescreve-lo
  // public async extractInitialCovers(fileNames: string[]): Promise<void> {
  //   try {
  //     const seriesData = await Promise.all(
  //       fileNames.map(fileName => this.storageOperations.selectSerieData(fileName))
  //     );

  //     const archivesPath = seriesData.map(serie => serie.name);

  //     const extractedPaths = await Promise.all(
  //       archivesPath.map(archivePath => this.createComic(archivePath, 1))
  //     );


  //     const chapterImages = await Promise.all(
  //       extractedPaths.map(chapterPath => this.foundFiles(chapterPath))
  //     );

  //     const initialCovers = (await Promise.all(
  //       chapterImages.map(images => this.analyzeImage(images))
  //     )).flat();

  //     for (const cover of initialCovers) {
  //       await this.CoverCreation(cover);
  //     }
  //   } catch (error) {
  //     console.error(`Erro em extrair a showcaseImage: ${error}`)
  //     throw error;
  //   }
  // }


  // private async analyzeImage(imagePaths: string[]): Promise<string[]> {
  //   const validImages: string[] = [];
  //   for (const imagePath of imagePaths) {
  //     try {
  //       const image = await Jimp.read(imagePath);
  //       if (image.bitmap.width <= 1200 && image.bitmap.height >= 1300) {
  //         validImages.push(imagePath);
  //         break;
  //       }
  //     } catch (error) {
  //       console.error(`[ERROR] Erro ao processar a imagem ${imagePath}:`, error);
  //       throw error;
  //     }
  //   }

  //   if (validImages.length === 0) {
  //     const specialImage = await this.analyzeSpecialImage(imagePaths);
  //     if (specialImage) validImages.push(specialImage);
  //   }

  //   return validImages;
  // }

  // private async analyzeSpecialImage(imagePaths: string[]): Promise<string | null> {
  //   for (const imagePath of imagePaths) {
  //     try {
  //       const image = await Jimp.read(imagePath);
  //       if (image.bitmap.width >= 400 || image.bitmap.height >= 600) {
  //         return imagePath;
  //       }
  //     } catch (error) {
  //       console.error(`[ERROR] Erro ao processar a imagem especial ${imagePath}:`, error);
  //       throw error;
  //     }
  //   }
  //   return null;
  // }


  // private async CoverCreation(imagePath: string): Promise<string> {
  //   const dirPath = path.dirname(imagePath);
  //   const directories = dirPath.split(path.sep);
  //   const serieName = directories[directories.length - 2];
  //   const chapterName = path.basename(dirPath);
  //   const coverFileName = `${serieName}_${chapterName}_${path.basename(imagePath)}`;
  //   const destinationPath = path.join(this.showcaseImages, coverFileName);

  //   const fileExists = await fs.promises.stat(imagePath).catch(() => false);
  //   if (!fileExists) throw new Error(`Arquivo ${imagePath} não encontrado.`);

  //   await fs.promises.copyFile(imagePath, destinationPath);
  //   return serieName;
  // }

  // public async teste() {
  //   const serieData = await this.storageOperations.readSerieData("C:\\Users\\Diogo\\Downloads\\Code\\gerenciador-de-arquivos\\storage\\data store\\json files\\Mangas\\Dr. Stone.json")
  //   const lastChapterId = serieData.reading_data.last_chapter_id;
  //   const lastChapter = serieData.chapters.find((c) => c.id === lastChapterId);

  //   if (!lastChapter) throw new Error(`Último capítulo não encontrado para a série ${serieData.name}`);

  //   if (lastChapter.is_dowload === false) {
  //     await this.createMangaEdtionById(serieData.data_path, lastChapter.id)
  //   }

  //   console.log(`/${serieData.name}/${serieData.id}/${lastChapter.name}/${lastChapterId}/${lastChapter.page.last_page_read}`)
  // }
}


// (async () => {
//   try {
//     const MangaOperations = new ImageManager();
//     console.log(await MangaOperations.teste())
//   } catch (error) {
//     console.error('Erro ao executar a função:', error);
//   }
// })();


