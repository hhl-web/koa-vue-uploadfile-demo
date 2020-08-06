const Router=require('koa-router');
const apiRouter=new Router();
const path=require('path');
const fs=require('fs');
const targetPath=path.resolve(__dirname,'../target/');
const splitExt=(filename='')=>{
  let name= filename.slice(0,filename.lastIndexOf('.'));
  let ext=filename.slice(filename.lastIndexOf('.')+1,filename.length);
  return {name,ext};
}
//文件合并
/**
 * 参数：filename :大文件mingc
 * nameHash:文件的MD5
 * SIZE:切割的大小
 */
apiRouter.post('/api/handleMerge',async (ctx)=>{
  const {filename,nameHash,SIZE}=ctx.request.body;
  const targetFilePath=path.resolve(targetPath,`${filename}`);
  const pipStream = (path, writeStream) => {
		return new Promise(resolve => {
			const readStream = fs.createReadStream(path);
			readStream.on("end", function(err){
				if(err) throw err;
				// fs.unlinkSync(path);
				resolve();
			});
			readStream.pipe(writeStream,{end:false});
		})
	};
  fs.readdir(path.resolve(targetPath,nameHash),async (err,files)=>{
    if(err) return console.log('err:',err);
    files.sort((a,b)=>a.split('_')[1]-b.split('_')[1]);
    files=files.map(file=>path.resolve(targetPath,nameHash,file));
    Promise.all(files.map(async(file,index)=>{
      return pipStream(file,fs.createWriteStream(targetFilePath,{
        start:index * SIZE,
        end:(index+1)*SIZE,
      }))
    }))
  })
  ctx.response.status=200;
})

module.exports=apiRouter;
