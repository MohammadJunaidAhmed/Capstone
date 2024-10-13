/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { StyledDropZone } from "react-drop-zone";
import "react-drop-zone/dist/styles.css";
import { IoIosCloseCircleOutline } from "react-icons/io";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";


const NavBar = ({ setAddingProduct }) => {
  return (
    <div className="flex text-lg">
      <div className="flex-1 gap-5 p-3">
        <div className="font-serif font-bold text-2xl">Add Product</div>
        <p className="text-sm font-thin">
          Add your product and necessary information from here
        </p>
      </div>
      <div className="flex-1 flex justify-end items-center gap-5 p-3">
        {/* <div>Language</div> */}
        <select className="p-5">
          <option>English</option>
          <option>Hindi</option>
        </select>
        <IoIosCloseCircleOutline onClick={() => setAddingProduct(false)} className="cursor-pointer text-3xl duration-150 hover:text-white"/>
      </div>
    </div>
  );
};

const Footer = ({addProduct, setAddingProduct}) => {
  
  return (
    <div className="w-full flex justify-evenly text-lg gap-5 mt-5 px-10 text-white">
      <button className="py-3 flex-1 bg-gray-500 rounded-lg flex justify-center items-center gap-2 duration-300 hover:bg-gray-600 hover:text-red-500" onClick={()=>{document.getElementById('mainbody').reset(); setAddingProduct(false)}}>
        Cancel
      </button>
      <button className="py-3 flex-1 bg-emerald-500 rounded-lg flex justify-center items-center gap-2 duration-300 hover:bg-emerald-600" onClick={addProduct} type="submit" form="mainbody">
        Add Product
      </button>
    </div>
  );
}; 
const ImageDrop = ({file, setFile, data, setData}) => { //TODO: IMAGE IS NOT GETTING STORED PROPER FORMATq;
  const label = file ? file : "Click or drop your file here";
  return (
    <div className="flex py-3 px-7 items-center border-slate-300">
      <h1 className="flex-1">Product Images</h1>
      <StyledDropZone onDrop={(file)=>{console.log(file); setData({...data, images: file})}} label={label} className="flex-1 h-32 flex justify-center items-center p-3 rounded-md bg-inherit border-[1px]"/>
    </div>
  );
};
const MainBody = ({data, setData}) => {
  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [predictedPrice, setPredictedPrice] = useState(0);
  const [shapImage, setShapImage] = useState(null);
  const [file, setFile] = useState(null);
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Call the API to get all products for a seller
        const response = await axios.get(`http://localhost:3000/api/v1/category`);
        setCategories(response.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCategories();
  }, []);
  const handleAIGeneration = async() => {
    setDialogOpen(true)
    console.log(data)
    const modelData = {
      "Cost Price": data.purchasePrice, 
      "MRP": data.mrp, 
      "Seller Rating": 4.5, 
      "Total Customers": 150, 
      "Avg Competitor Price": 8500, 
      "Min Competitor Price": 8000, 
      "Max Competitor Rating": 4.8, 
      "Competitor Price-Rating Ratio": 1666.66
  }
  //   const modelData = {
  //     "Cost Price": 500, 
  //     "MRP": 1000, 
  //     "Seller Rating": 4.5, 
  //     "Total Customers": 150, 
  //     "Avg Competitor Price": 850, 
  //     "Min Competitor Price": 800, 
  //     "Max Competitor Rating": 4.8, 
  //     "Competitor Price-Rating Ratio": 166.66
  // }
  console.log(modelData)
    const response = await axios.post(`http://127.0.0.1:5000/predict`, modelData);
    fetchShapGraph();
    console.log(response.data.predicted_price)
    setPredictedPrice(response.data.predicted_price)

  }
  const fetchShapGraph = async () => {
    try {
      const response = await axios({
        url: 'http://localhost:5000/shap_graph',
        method: 'GET',
        responseType: 'blob', // Important to specify response type as blob
      });
  
      // Create a local URL for the image and set it in state
      const imageObjectURL = URL.createObjectURL(response.data);
      setShapImage(imageObjectURL);
    } catch (error) {
      console.error('Error fetching SHAP graph:', error);
    }
  };
  

  return (
    <form id="mainbody" className="border-slate-300" onSubmit={(e)=>{e.preventDefault();}}>
      <Dialog
      open={dialogOpen}
      >
        <DialogTitle>VSHOP AI</DialogTitle>
        <DialogContent>
          <h1>Best Sale Price is: {predictedPrice}</h1>
          <img src={shapImage}></img>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{setDialogOpen(false)}}>Cancel</Button>
          <Button onClick={()=>{setDialogOpen(false)}} autoFocus>
            Copy to selling price
          </Button>
        </DialogActions>
      </Dialog>
      {/* TITLE */}
      <div className="flex py-3 px-7 items-center ">
        <h1 className="flex-1">Product Title/Name</h1>
        <input
          type="text"
          required
          className="flex-1 flex justify-end p-3 rounded-md bg-inherit border-[1px]"
          onChange={(e)=>{setData({...data,'productName': e.target.value});}}
        />
      </div>
      {/* DESCRIPTION */}
      <div className="flex py-3 px-7 items-center">
        <h1 className="flex-1">Product Description</h1>
        <textarea
          type="text"
          required
          className="flex-1 flex justify-end p-3 rounded-md bg-inherit border-[1px]"
          onChange={(e)=>{setData({...data,'description': e.target.value});}}
        />
      </div>
      <ImageDrop file={file} setFile={setFile} daeta={data} setData={setData}/>
      {/* SKU */}
      <div className="flex py-3 px-7 items-center">
        <h1 className="flex-1">Product SKU</h1>
        <input
          type="text"
          required
          className="flex-1 flex justify-end p-3 rounded-md bg-inherit border-[1px]"
          onChange={(e)=>{setData({...data,'stock': +e.target.value});}}
        />
      </div>
      {/* CATEGORY */}
      <div className="flex py-3 px-7 items-center">
        <h1 className="flex-1">Product Category</h1>
        <select id="category" 
        className="h-12 flex-1 bg-inherit border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onChange={(e)=>{setData({...data,'category':e.target.value});}}
        >
          {
            categories.map((category)=>{
              return(
                <option value={category.id} key={category.id}>{category.name}</option>
              )
            })
          }
        </select>
      </div>
      {/* MRP */}
      <div className="flex py-3 px-7 items-center">
        <h1 className="flex-1">Product MRP</h1>
        <input
          type="text"
          className="flex-1 flex justify-end p-3 rounded-md bg-inherit border-[1px]"
          onChange={(e)=>{setData({...data,'mrp': +e.target.value});}}
        />
      </div>
      {/* PURCHASE PRICE */}
      <div className="flex py-3 px-7 items-center">
        <h1 className="flex-1">Product Purchase Price</h1>
        <input
          type="text"
          className="flex-1 flex justify-end p-3 rounded-md bg-inherit border-[1px]"
          onChange={(e)=>{setData({...data,'purchasePrice': +e.target.value});}}
        />
      </div>
      {/* SALE PRICE */}
      <div className="flex py-3 px-7 items-center">
        <h1 className="flex-1">Product Sale Price</h1>
        <div className="flex-1 flex justify-center items-center p-3 border-[1px] rounded-md">
          <input
            type="text"
            required
            className="flex-1 flex justify-end rounded-md bg-inherit border-0 outline-none"
            onChange={(e)=>{setData({...data,'sellerPrice': +e.target.value});}}
          />
          <button className="bg-gradient-to-r from-sky-500 to-indigo-500 text-white p-2 rounded-md" onClick={handleAIGeneration}>
            Generate using AI
          </button>
        </div>
      </div>
    </form>
  );
};

const AddProductPage = ({ setAddingProduct, setIsSubmitClicked }) => {
  const [data, setData] = useState({});
  const sellerId = localStorage.getItem("sellerId");
  const addProduct = async () => {
    try {
      // Call the API to get all products for a seller
      setIsSubmitClicked(true);
      console.log(data)
      await axios.post(`http://localhost:3000/api/v1/sellers/${sellerId}/products/`, {
        productName: data.productName,
        category: data.category ? data.category : '6700dd4aa808b22f116b502d',
        mrp: data.mrp,
        description: data.description,
        purchasePrice: data.purchasePrice,
        sellerPrice: data.sellerPrice,
        stock: data.stock,
        images: data.images ? data.images: '',
      });
      const notify = () => toast("Product Added Successfully!");
      notify();
      document.getElementById('mainbody').reset()
      setAddingProduct(false);
      setIsSubmitClicked(false);
    } catch (err) {
      const errorNotify = () => toast(`Something went wrong.\n Error: ${err}`);
      errorNotify();
      console.error(err);
    }
  }
  return (
    <div className="text-slate-400 h-full">
      <NavBar
        setAddingProduct={setAddingProduct}
      />
      <MainBody 
        data={data} 
        setData={setData} 
      />
      <Footer 
        addProduct={addProduct} 
        setAddingProduct={setAddingProduct}
      />
    </div>
  );
};

export default AddProductPage;