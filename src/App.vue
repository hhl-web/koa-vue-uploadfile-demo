<template>
  <div id="app">
    <div id="drag"
         ref="drag"
         @dragover="handleOver"
         @drop="handleDrop">
      <input type="file"
             id="inputDom"
             @change="handleChange"
             multiple />
      <label for="inputDom">上传图片</label>
    </div>
    <div class="context"
         v-for="(file,index) in isShowReader"
         :key="index">
      <label>{{file.name}}</label>
      <i class="el-icon-view"
         v-if="file._flag"
         @click="handleRead(file)"></i>
    </div>
    <div class="action">
      <el-button @click="handleUpload">上传</el-button>
      <el-button @click="handleCancel">暂停</el-button>
      <el-button @click="handleAgain">重新上传</el-button>
    </div>
    <el-dialog :visible.sync="dialogVisible"
               ref="dialog">
      <img ref="image"
           id="img" />
      <div ref="list"
           id="list"></div>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import SparkMD5 from 'spark-md5';
const ImgType=["gif", "jpeg", "jpg", "bmp", "png"];
const ListType = ['txt','xls', 'xlsx','doc', 'docx','ppt', 'pptx','pdf'];
//数据转换
let splitFilename=(prop='')=>{
  return prop.slice(0,prop.lastIndexOf('_'));
}
let splitFileHash=(prop='')=>{
  let filename=prop.slice(0,prop.lastIndexOf('_'));
  let nameHash=prop.slice(prop.lastIndexOf('_')+1,prop.length);
  return {filename,nameHash}
}
export default {
  name: 'app',
  props: {
    multiple:{
      type:Boolean,
      default:false,
    },
    SIZE:{
      type:Number,
      default:1*1024*1024
    }
  },
  data(){
    return {
      filesAry:[],
      dialogVisible:false,
      cancelAry:[]
    }
  },
  computed:{
    isShowReader(){
      return this.filesAry.map(file=>{
        const ext=file.name.slice(file.name.lastIndexOf('.')+1,file.name.length);
        if(ImgType.includes(ext) || ListType.includes(ext)){
          file._flag=true;
        }else{
          file._flag=false;
        }
        file._ext=ext;
        return file
      })
    }
  },
  mounted () {},
  methods: {
    createMd5(fileChunkList=[]){
				let currentChunk=0,md5;
				let reader=new FileReader();
				let spark = new SparkMD5.ArrayBuffer();	
				function readFile(){
					if(fileChunkList[currentChunk].file){
						reader.readAsArrayBuffer(fileChunkList[currentChunk].file)
					}
				}
				readFile();
				return new Promise(resolve=>{
					reader.onload=e=>{
						currentChunk++;
						spark.append(e.target.result);
						if(currentChunk<fileChunkList.length){
							readFile();
						}else{
							md5=spark.end();
							resolve(md5);
						}
					};
				})
		},
    createRequest({method='post',url='',data={}}){
      axios.interceptors.request.use((config)=>{
          let CancelToken = axios.CancelToken;
          //设置取消函数
          config.cancelToken = new CancelToken((c)=>{
            this.cancelAry.push({fn:c,url:config.url});
          });
          return config;
          },(err)=>{
              return Promise.reject(err);
          });
      axios.interceptors.response.use((response)=>{
          let {config} =response;
          this.cancelAry=this.cancelAry.filter(cancel=>cancel.url!==config.url);
          return response;
          },(err)=>{
            return Promise.reject(err);
          });
      return axios({
              method:method,
              url:url,
              data:data,
            })
    },
    //将单个文件切割
    handleChunk(file){
      let current=0;
      let fileList=[];
      while(current<=file.size){
        fileList.push({
          file:file.slice(current,this.SIZE+current)
        });
        current+=this.SIZE;
      }
      return fileList;
    },
    //将大文件切割
    createChunk(files=[]){
      let filesObj=files.reduce((pre,cur,index,ary)=>{
        pre[`${cur.name}_${index}`]=this.handleChunk(cur);
        return pre;
      },{});
      return filesObj;
    },
    //将每个切片组装成formdata对象
    createFormDataRequest(files=[],prop='',nameHash='',fileName='',fileChunk=[]){
      let target=files.filter((file,index)=>fileChunk.includes(`${fileName}_${index}`)!=true).map((file,index)=>{
        let formdata= new FormData();
        formdata.append('file',file.file);
        formdata.append('index',index);
        formdata.append('hash',prop);
        formdata.append('nameHash',nameHash);
        formdata.append('filename',fileName);
        return {formdata,index};
      }).map(({formdata,index})=>{
        return this.createRequest({
            method:'post',
            url:'http://localhost:3001/api/handleUpload',
            data:formdata,
          })
      })
      return target;
    },
    //在一个拖动过程中，释放鼠标键时触发此事件
    handleDrop(e){
        e.preventDefault();
        this.filesAry=Array.from(e.dataTransfer.files);
        this.data=this.createChunk(this.filesAry);
    },
    //当某被拖动的对象在另一对象容器范围内拖动时触发此事件
    handleOver(e){
      e.preventDefault();
    },
    //接受文件函数
    handleChange(e){
      this.filesAry=Array.from(e.target.files);
      this.data=this.createChunk(this.filesAry);
    },
    //点击上传函数
    async handleUpload(e){
       this.targetRequest={};
      for(let prop in this.data){
        if(this.data.hasOwnProperty(prop)){
            let fileName=splitFilename(prop);
            let nameHash=await this.createMd5(this.data[prop]);
            let {result,fileChunk}=await this.handleAgain(this.data[prop],prop,nameHash,fileName);
            if(!result){
              return;
            }
            this.targetRequest[`${fileName}_${nameHash}`]=this.createFormDataRequest(this.data[prop],prop,nameHash,fileName,fileChunk);
        }
      }
      Object.keys(this.targetRequest).forEach(async key=>{
        let {filename,nameHash} =splitFileHash(key);
        await Promise.all(this.targetRequest[key]).then(async res=>{
          this.createRequest({
              method:'post',
              url:'http://localhost:3001/api/handleMerge',
              data:{
                filename,
                nameHash,
                SIZE:this.SIZE
              },
          }).then(res=>{
            this.$message.success({
              message:`${filename}上传成功~`
            })
          })
        })
      })
    },
    //点击暂停函数
    handleCancel(e){
      this.cancelAry.forEach(fn=>fn());
      this.cancelAry=[];
    },
    //点击重新上传函数
    async handleAgain(nameHash,filename,requestChunk=[]){
      let result,fileChunk=[];
        await this.restoreFile(nameHash,filename).then(res=>{
          if(res.status==200){
            if(res.data.flag==false){
              this.$message('秒传成功~~');
              result=true;
            }else{
              // this.createFormDataRequest(requestChunk,prop,nameHash,filename,res.data.fileChunk);
              fileChunk=re.data.fileChunk;
            }
          }
        })
      return {result,fileChunk};
    },
    restoreFile(filename,nameHash){
      return this.createRequest({
          method:'post',
          url:'http://localhost:3001/api/handleAgain',
          data:{
            filename,
            nameHash
          }
      })
    },
    handleRead(file){
      let fr=new FileReader();
      this.dialogVisible=true;
      if(ImgType.includes(file._ext)){
        let url=fr.readAsDataURL(file);
        fr.onload=(e)=>{
          this.$refs.image.src=e.target.result;
        }
      }else{
        let list=fr.readAsText(file);
        fr.onload=(e)=>{
          this.$refs.list.innerHTML =e.target.result;
        }
      }
    }
  }
}
</script>

<style lang="scss">
#app {
  .el-dialog__body {
    padding: 10px 0;
    background: rgba(0, 0, 0, 0.3);
  }
  .el-dialog__headerbtn {
    top: 5px;
  }
  #drag {
    height: 150px;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #5f87e0;
    text-align: center;
    line-height: 150px;
    cursor: pointer;
    &:hover {
      border: 1px solid #f2f2f2;
    }
    #inputDom {
      display: none;
    }
    label {
      display: inline-block;
      cursor: pointer;
    }
  }
  .context {
    height: 25px;
  }
  .action {
    margin-top: 20px;
  }
  #img {
    display: block;
    margin: 0 auto;
  }
}
</style>
