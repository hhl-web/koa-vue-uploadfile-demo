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


//合并文件
/**
 * hash：大文件名+大文件索引
 * nameHash：大文件的MD5
 * filename:文件名称
 * index：小文件分片的索引
 */
apiRouter.post('/api/handleUpload',async (ctx)=>{
  const {hash,nameHash,filename,index}=ctx.request.body;
  const chunkPath=path.resolve(targetPath,`${nameHash}`);
  if(!fs.existsSync(chunkPath)){
    await fs.mkdirSync(chunkPath);
  }
  const {name,ext}=splitExt(filename);
  console.log(ctx.request.files.file.path,'-',index);
  await fs.renameSync(ctx.request.files.file.path,`${chunkPath}/${filename}_${index}`);
  return ctx.response.status=200;
});



module.exports=apiRouter;