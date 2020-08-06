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

//重新上传文件
/**
 * nameHash：大文件的MD5
 * filename:文件名称
 */
apiRouter.post('/api/handleAgain',async (ctx)=>{
  const {nameHash,filename}=ctx.request.body;
  console.log(nameHash,filename)
  const chunkPath=path.resolve(targetPath,`${nameHash}`);
  if(fs.existsSync(chunkPath)){
    let filesChunk=await fs.readdirSync(chunkPath);
    return ctx.body={fileChunk:filesChunk,filename:filename,flag:true}; //找到了
  }else{
    return ctx.body={fileChunk:[],filename:filename,flag:false};  //找不到
  }
});



module.exports=apiRouter;