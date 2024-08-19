import {observable, computed} from "mobx";
import * as $ from 'jquery';
import RcfaBdaService from "../../../../services/rfca-bda-service";
import { RcfaBdaClientForm } from "../../../../models/rcfa-bda-form";
import { AxiosError } from "axios";
import { IModelStateError } from "../../../../models/i-model-state-error";
import RestoringPage from "./bda-restoring-page";
import AzureStorageService from "../../../../services/azure-storage-service";
import BlobService from "../../../../services/blob-service";
import UIAlertController from "../../../../lib/custom-dialogs/core/ui-alert-controller";
import { UIAlertControllerStyle } from "../../../../lib/custom-dialogs/core/ui-alert-controller-style";
import DialogRenderer from "../../../../lib/custom-dialogs/components/dialog-renderer/dialog-renderer";
import PixieImageEditorWidget from '../../../common/pixie-image-editor-widget/pixie-image-editor-widget';
import * as uuid from 'uuid/v4';
import { RcfaBdaChangedComponents } from "../../../../models/rcfa-bda-changed-components";
import FileUploadModel from "../../../../models/file-upload";
import * as moment from "moment";
import {ISO_SHORT_DATE_FORMAT, MATERIALIZE_SETTINGS} from "../../../../config/theme";

export default class BdaRestoringPageLogic {

    private rcfaBdaService: RcfaBdaService;
    private azureService: AzureStorageService;
    private blobService: BlobService;
    private containerName:string = 'bdacontainer';

    public descriptionPageFile: HTMLInputElement | null = null;

    public pixieImageEditorWidget: PixieImageEditorWidget | null = null;

    @observable
    public rcfaBdaClientForm: RcfaBdaClientForm = {...new RcfaBdaClientForm()}

    @observable
    public sasToken:string = '';

    @observable
    public modelStateErrors:IModelStateError|null = null;

    @observable
    public isUploadingFiles:boolean = false;

    @observable
    public isDisabledBtnAddComponent:boolean = false;

    @computed
    public get rcfaDescriptionImageBlobUri ():string|undefined{
        if(this.rcfaBdaClientForm.RepairEvidenceBlob){
            if(this.rcfaBdaClientForm.RepairEvidenceBlob.uri){
                return this.rcfaBdaClientForm.RepairEvidenceBlob.uri;
            }
        }

        return  undefined;
    }

    constructor(rcfaDasClientForm: RcfaBdaClientForm, private component:RestoringPage) {
        this.rcfaBdaClientForm = rcfaDasClientForm;
        this.rcfaBdaService = new RcfaBdaService();
        this.azureService = new AzureStorageService();
        this.blobService = new BlobService();

        console.log("pixie", this.pixieImageEditorWidget)
    }

    public SetClientForm(form: RcfaBdaClientForm) {
        this.rcfaBdaClientForm = form;
    }

    public async onComponentDidMount() {
        try {
            await this.obtenerSasToken()
            this.initializeMaterial();
        } catch (err) {
            console.log(err);
        }finally{
            this.component.forceUpdate();
        }
    };

    private getAxiosError(error: Error): AxiosError {
        return error as AxiosError;
    }

    private initializeMaterial = () => {
        let datePickerSettings = {
            maxDate: new Date(),
            defaultDate: this.rcfaBdaClientForm.MechanicalWorkDoneDatetime ? moment(this.rcfaBdaClientForm.MechanicalWorkDoneDatetime) : new Date(),
            setDefaultDate: true,
            todayBtn: true,
            i18n: MATERIALIZE_SETTINGS.datepicker.i18n.spanish
        };

        $('#RestoringFinishDate.datepicker').on('change', this.handleProblemDateChange).datepicker(datePickerSettings);

        ($('.tabs')as any).tabs({onShow: () => { this.component.forceUpdate() } });
        ($('.modal')as any).modal();
        ($('select.material-opt-in') as any).formSelect();
    };

    public validationMessageFor(field:string){
        if(this.modelStateErrors === null || !this.modelStateErrors.ModelState){
            return null;
        }
        let message = null;
        if (this.modelStateErrors.ModelState[field]) {
            message = this.modelStateErrors.ModelState[field];
        }else if(this.modelStateErrors.ModelState[`clientForm.${field}`]){
            message = this.modelStateErrors.ModelState[`clientForm.${field}`];
        }
        
        return message;
    }
    
    public handleFormSubmit = async (changeState:boolean, svgArray:File[]) => {
        const controller = new UIAlertController<void>("Aviso", "Se están procesando los datos", UIAlertControllerStyle.alert);
        const closeBlocker = DialogRenderer.PresentBlocker(controller);
        
        if (svgArray.length != 0) {
            let blobName = uuid() + '.png';
            let responseAzure = await this.azureService.saveBlobFileAsync(this.containerName, blobName, svgArray[0]);
            let responseBlob = await this.blobService.saveBlob(responseAzure.containerName, responseAzure.blobName, responseAzure.uri);
            this.rcfaBdaClientForm.RepairEvidenceBlobId = responseBlob.id.toString();
        }
        if(changeState){
            try {
                let result = await this.rcfaBdaService.changeState(this.rcfaBdaClientForm);
                closeBlocker();
                return result;
            }
            catch(error) {
                closeBlocker();
                this.handleError(error);
                throw error;
            }
        }else{
            try {
                let result =  await this.rcfaBdaService.createBda(this.rcfaBdaClientForm);  
                closeBlocker();
                return result;                  
            }
            catch(error) {
                closeBlocker();
                this.handleError(error);
                throw error;
            }
        }
    }

    private handleProblemDateChange = (event: any) => {
        this.rcfaBdaClientForm.MechanicalWorkDoneDatetime = this.getIsoDateFromWeirdMaterializeCssJQueryEvent(event);      
    }

    private getIsoDateFromWeirdMaterializeCssJQueryEvent(weirdEvent: any): string {
        const eventData = (weirdEvent.originalEvent as any).firedBy;
        if (!eventData) return '';
        const date = eventData.date as Date | null;
        return date ? moment(date).format(ISO_SHORT_DATE_FORMAT) : '';
    }

    public handleRepairTimeHoursChange =(event: React.ChangeEvent<HTMLSelectElement>)=>{
        this.rcfaBdaClientForm.RepairTimeHours = parseInt(event.target.value);
    }

    public handleRepairTimeMinutesChange =(event: React.ChangeEvent<HTMLSelectElement>)=>{
        this.rcfaBdaClientForm.RepairTimeMinutes = parseInt(event.target.value);
    }

    public handleRepairTimeSecondsChange =(event: React.ChangeEvent<HTMLSelectElement>)=>{
        this.rcfaBdaClientForm.RepairTimeSeconds = parseInt(event.target.value);
    }

    public handleImageEditorSave = (data:string, fileName:string, type:string) =>{
        if(this.pixieImageEditorWidget){              
            if(this.descriptionPageFile)
                this.descriptionPageFile.value = data;
        }
    }

    public handleAddChangedComponent = async (event: React.MouseEvent<HTMLButtonElement>) =>{
        if(this.rcfaBdaClientForm.Id){
            this.isDisabledBtnAddComponent = true;
            let rcfaBdaChangedComponents = await this.rcfaBdaService.postNewchangedpart(this.rcfaBdaClientForm.Id)
            this.rcfaBdaClientForm.ChangedComponents.push(rcfaBdaChangedComponents);
            this.isDisabledBtnAddComponent = false;
            this.component.forceUpdate();
        }
    };

    public handleChangeDescriptionComponent = (event:React.ChangeEvent<HTMLInputElement>) =>{
        let id = event.target.id.split('_')[1];
        this.rcfaBdaClientForm.ChangedComponents.forEach((itm:RcfaBdaChangedComponents, index:number)=>{
            if(itm.Id === parseInt(id)){
                this.rcfaBdaClientForm.ChangedComponents[index].ChangedComponentDescription = event.target.value;
            }
        });
        this.component.forceUpdate();
    }

    public handleChangeReplacementNumber = (event:React.ChangeEvent<HTMLInputElement>) =>{
        let id = event.target.id.split('_')[1];
        this.rcfaBdaClientForm.ChangedComponents.forEach((itm:RcfaBdaChangedComponents, index:number)=>{
            if(itm.Id === parseInt(id)){
                this.rcfaBdaClientForm.ChangedComponents[index].PartNumberText = event.target.value;
            }
        });
        this.component.forceUpdate();
    }

    public handleDeleteChangedComponent = async (event:React.MouseEvent<HTMLButtonElement>, id:number) =>{
        let rcfaBdaChangedComponents = await this.rcfaBdaService.getDeleteChangedpart(id);
        if(rcfaBdaChangedComponents){
            let index = this.rcfaBdaClientForm.ChangedComponents.map(e => e.Id).indexOf(id);
            if (index > -1) {
                this.rcfaBdaClientForm.ChangedComponents.splice(index, 1);
            }
            this.component.forceUpdate();
        }
    }

    public handleCodeUpload = (file:FileUploadModel, obj:any) =>{
        let objRcfaBdaChangedComponents:RcfaBdaChangedComponents = obj;
        if (!file.blob){
            return;
        }

        this.rcfaBdaClientForm.ChangedComponents.forEach((itm:RcfaBdaChangedComponents, index:number)=>{
            if(itm.Id === objRcfaBdaChangedComponents.Id){
                this.rcfaBdaClientForm.ChangedComponents[index].sasToken = file.sasToken;
                this.rcfaBdaClientForm.ChangedComponents[index].PartNumberBlob = file.blob;
            }
        });

        this.isUploadingFiles = false;
        this.component.forceUpdate();
    }

    public handleLoadModal=(event:React.MouseEvent<HTMLButtonElement>, sasToken:string)=>{
        event.preventDefault();
        this.sasToken = sasToken;
        this.openModal();
    }

    public openModal =()=>{
        ($('.modalCodigo') as any).modal('open');
    }

    public closeModal =(event:React.MouseEvent<HTMLButtonElement>|null=null)=>{
        if(event){
            event.preventDefault();
        }
        ($('.modal') as any).modal('close')
    }

    public handleCodeStartUpload = () =>{
        this.isUploadingFiles = true;
    }

    public handleCodeFinish = () => {
        this.isUploadingFiles = false;
    }

    public handleCodeFail = (err:any)=>{
        console.log(err)
        this.isUploadingFiles = false;
    }

    private handleError(error: Error) {
        const axiosError = this.getAxiosError(error);
        if (!axiosError.response || !axiosError.response.data) {
            console.error('No axios error or error response with missing "data".', { error });
            return;
        }

        const modelStateErrors = axiosError.response.data as IModelStateError;

        if (axiosError.response.status) {
            modelStateErrors.Message = 'Uno o mas campos requeridos están vacios.';
        }

        if (!modelStateErrors.Message || !modelStateErrors.ModelState) {
            console.error('No model state info', { error });
            return;
        }

        this.modelStateErrors = modelStateErrors;
    }

    public async obtenerSasToken(){
        await Promise.all(this.rcfaBdaClientForm.ChangedComponents.map(async(itm:RcfaBdaChangedComponents, index:number)=>{
            if(itm.PartNumberBlob){
                if(itm.PartNumberBlob.id){
                    this.rcfaBdaClientForm.ChangedComponents[index].sasToken = await this.sastokenFullUrl(itm.PartNumberBlob.uri) ;
                }
            }
        }));
    }

    private async sastokenFullUrl(originalBlobURl:string):Promise<string>{
        var blobUri = new URL(originalBlobURl);
        var splitedUri =  blobUri.pathname.split("/");
        var containerName = splitedUri[1];
        let blobName = splitedUri[splitedUri.length -1];
        if (blobName == null || typeof(blobName) === "undefined" || blobName == "") {
            blobName = splitedUri[splitedUri.length -2];
        }

        let sasToken = await this.azureService.getBlobSasToken(containerName, blobName);
        return sasToken.resource + sasToken.token;
    }
}