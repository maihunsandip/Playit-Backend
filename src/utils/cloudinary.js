import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET
});

const   uploadOnCloudinary = async (localFilePath) => {
  try {
    if(!localFilePath) return null;
    //upload the file
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto'
    })
    //file uploaded 
    // console.log("file uploaded on cloudinary!", response.url)
    fs.unlinkSync(localFilePath) //remove the locally saved temporary file
    return response;
    
  } catch (error) {
    fs.unlinkSync(localFilePath) //remove the locally saved temporary file as upload operation faild
    return null;
  }
}


export {uploadOnCloudinary}