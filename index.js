import { createServer } from "http";
import { readFile, readdir } from "fs/promises";
import { join, dirname, parse } from "path";

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "localhost";
const STATIC_FILES = "public";

const __filename = new URL(import.meta.url).pathname;
const __dirname = dirname(__filename);

const supportedExtensions = {
  ".html": "text/html",
  ".ico": "image/x-icon",
};

const getResources = await readdir(STATIC_FILES, {
  withFileTypes: true,
  recursive: true,
});

const staticAssets = getResources.reduce((acc, file) => {
  acc[`/${parse(file.name).name}`] = join(__dirname, STATIC_FILES, file.name);
  return acc;
}, {});

function getResource(resource) {
  const parsedResource = `/${parse(resource).name}`;
  const urlAsset = parsedResource === "/" ? "/home" : parsedResource;
  const path = staticAssets[urlAsset] ?? staticAssets["/404"];

  const isResource = staticAssets.hasOwnProperty(urlAsset);

  return {
    contentPath: path,
    statusCode: isResource ? 200 : 404,
    extension: parse(path).ext,
  };
}

function broadcastResource(statusCode, header, content, res) {
  res.writeHead(statusCode, { "Content-Type": header });
  res.end(content);
}

const server = createServer(async (req, res) => {
  const { url, method } = req;
  const { contentPath, statusCode, extension } = getResource(url);

  try {
    if (method !== "GET") {
      res.writeHead(405, { "Content-Type": "text/plain" });
      return res.end("Method Not Allowed");
    }

    const content = await readFile(contentPath);

    supportedExtensions.hasOwnProperty(extension)
      ? broadcastResource(
          statusCode,
          supportedExtensions[extension],
          content,
          res,
        )
      : broadcastResource(403, "text/plain", "Extension not supported", res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOSTNAME, () => {
  console.log(`Server is running on port http://${HOSTNAME}:${PORT}`);
});
