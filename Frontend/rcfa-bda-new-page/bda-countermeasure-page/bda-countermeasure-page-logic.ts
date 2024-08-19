import * as $ from 'jquery';
import CountermeasurePage from "./bda-countermeasure-page";
import FiveWhyNode from "../../../../models/five-why-node"; 
import {observable, computed} from "mobx";
import FiveWhyCountmeassure from "../../../../models/five-why-countermeassure"
import CounterMeasureService from "../../../../services/counter-measure-service";
import { RcfaBdaClientForm } from "../../../../models/rcfa-bda-form";
import CountermeasureTypeDetail from "../../../../models/countermeasure-type-detail";
import IEmployee from '../../../../models/i-employee';
import EmployeeService from '../../../../services/employee-service';
import { ISO_SHORT_DATE_FORMAT, MATERIALIZE_SETTINGS } from "../../../../config/theme";
import * as moment from "moment";
import { AxiosError } from "axios";
import RcfaBdaService from "../../../../services/rfca-bda-service";
import { IModelStateError } from '../../../../models/i-model-state-error';
import UIAlertController from '../../../../lib/custom-dialogs/core/ui-alert-controller';
import { UIAlertControllerStyle } from "../../../../lib/custom-dialogs/core/ui-alert-controller-style";
import DialogRenderer from "../../../../lib/custom-dialogs/components/dialog-renderer/dialog-renderer";
import FileUploadModel from '../../../../models/file-upload';
import CountermeasureEvidence from '../../../../models/countermeasure-evidence';
import AzureStorageService from "../../../../services/azure-storage-service";
import { ChangeEvent } from "react";

export default class BdaCountermeasurePageLogic {
    private counterMeasureService:CounterMeasureService;
    private employeeService: EmployeeService;
    private rcfaBdaService: RcfaBdaService;
    private azureStorageService: AzureStorageService;

    @observable
    public rcfaBdaClientForm: RcfaBdaClientForm = {...new RcfaBdaClientForm()}

    @observable 
    public fiveWhyAnalysisId:number;

    @observable
    public rootCauses:Array<FiveWhyNode> = [];

    @observable
    public fiveWhyCountmeassures:Array<FiveWhyCountmeassure> = [];

    @observable
    public fiveWhyCountmeassure = new FiveWhyCountmeassure();

    @observable
    public ResponsibleEmployeeValidate: IEmployee[] = [];

    @observable
    public DateValidate: Date | null = null;

    @observable
    public PlannedDateValidate: Date | null = null;

    @observable
    public fiveWhyCountmeassureId:number|null = null;

    @observable
    public modelStateErrors:IModelStateError|null = null;

    @observable 
    public isLoadingCountermeasure:boolean = false;

    @observable 
    public isLoadingCountermeasureCards:boolean = false;

    @observable
    public isSaveCounterMeasure:boolean = false;

    @observable
    public isSaveValidation:boolean = false;

    @observable
    public isFillOldData: boolean = false;

    @observable
    public countermeassureTypeId: number | null = 1;
    public details: any[] =[];
    

    public modalTitle: string = "Nueva contramedida";
    @observable private selectedCards: any[] = [];
    @observable public orderByDescending: boolean = false;
    @computed public get orderByFieldId(): number | null {
        if (this.orderByField == null)
            return null;
        else if (this.orderByField == "id" || this.orderByField == "Id")
            return 1;
        return 1;
    }
    @computed public get orderByWayId(): number {
        return this.orderByDescending ? 2 : 1;
    }
    @observable public orderByField: string | null = null;

    constructor(rcfaDasClientForm: RcfaBdaClientForm, FiveWhyAnalysisId:number, private component:CountermeasurePage){
        this.rcfaBdaClientForm = rcfaDasClientForm;
        this.counterMeasureService = new CounterMeasureService();
        this.fiveWhyAnalysisId = FiveWhyAnalysisId;
        this.rcfaBdaService = new RcfaBdaService();
        this.employeeService = new EmployeeService();
        this.azureStorageService = new AzureStorageService();
    }

    private getAxiosError(error: Error): AxiosError {
        return error as AxiosError;
    }

    public openModalCountermeasure(){
        const M = (window as any).M;
        var _elem = document.querySelector('.modalCountermeasure');
        var modal = (M as any).Modal.getInstance(_elem);
        modal.options.dismissible = false;
        modal.open();
        $('#counterMeasure').addClass('active');
    }

    public openModalvalidation(){
        ($('.modalvalidation') as any).modal('open');
        $('#counterMeasure').addClass('active');
    }

    public closeModal =async(event:React.MouseEvent<HTMLButtonElement>|null, oldData:boolean = false)=>{
        if(event){
            event.preventDefault();
            if(oldData){
                this.isFillOldData = true;
                this.fiveWhyCountmeassures = await this.sasToken();
                this.isFillOldData = false;
                this.countermeassureTypeId = 0;
                this.details = [];
            }
        }
        ($('.modal') as any).modal('close')
    }
    public handleOnSortBy = async (columnName: string) => {
        if (this.orderByField == columnName) {
            this.orderByDescending = !this.orderByDescending;
        } else {
            this.orderByField = columnName;
            this.orderByDescending = true;
        }
        if (this.orderByField == null)
            this.orderByField = columnName;

        //await this.updateCards({ append: false });
    };
    private initializeMaterial = () => {
        const datePickerSettings = {
            maxDate: new Date(),
            defaultDate: new Date(),
            setDefaultDate: true,
            todayBtn: true,
            i18n: MATERIALIZE_SETTINGS.datepicker.i18n.spanish,
            container: 'body'
        };
        const plannedDatePickerSettings = {
            minDate: this.setMinDatePlanned(),
            maxDate: this.setMaxDatePlanned(),
            defaultDate: this.setDefaultDate(),
            setDefaultDate: true,
            todayBtn: true,
            i18n: MATERIALIZE_SETTINGS.datepicker.i18n.spanish,
            container: 'body'
        };
        $('#CompletedDate.datepicker').on('change', this.reportDateChange).datepicker(datePickerSettings);
        $('#PlannedDate.datepicker').on('change', this.handlePlannedDateChange).datepicker(plannedDatePickerSettings);
        ($('select.material-opt-in') as any).formSelect();
        const M = (window as any).M;
        var elems = document.querySelectorAll('.modal');
        M.Modal.init(elems, {dismissible:false});
    };
    private setDefaultDate = () => {
        
        return new Date();
    }
    private handlePlannedDateChange = (event: any) => {
        this.PlannedDateValidate = moment(this.getIsoDateFromWeirdMaterializeCssJQueryEvent(event)).toDate();
    }
    private setMaxDatePlanned = () => {
        
        let date = moment().add(30, 'days');
        return new Date(date.format('YYYY-MM-DD'));
    }
    private setMinDatePlanned = () => {
        
        return new Date();
    }
    public async onComponentDidMount() {
        try {
            

            this.initializeMaterial();
            this.isLoadingCountermeasure = true;
            this.rootCauses = await this.counterMeasureService.getRootCauses(this.fiveWhyAnalysisId);
            this.isLoadingCountermeasure = false;

            this.isLoadingCountermeasureCards = true;
            this.fiveWhyCountmeassures = await this.sasToken();
            this.isLoadingCountermeasureCards = false;
        } catch (err) {
            this.isLoadingCountermeasure = false;
            this.isLoadingCountermeasureCards = false;
            console.log(err);
        }
    };  
    
    private sasToken = async (oldFiveWhyCountmeassures:Array<FiveWhyCountmeassure> = []) =>{

        if(oldFiveWhyCountmeassures.length == 0){
            oldFiveWhyCountmeassures = await this.counterMeasureService.getFiveWhyCountmeassure(this.fiveWhyAnalysisId)
        }
        
        return await Promise.all(oldFiveWhyCountmeassures   .map(async(obj)=>{
            let newEvidence = await this.sasTokenEvicence(obj.Evidences);
            let newFiveWhyCountmeassures:FiveWhyCountmeassure = new FiveWhyCountmeassure;
            newFiveWhyCountmeassures.Id = obj.Id;
            newFiveWhyCountmeassures.CountermeassureDescription = obj.CountermeassureDescription;
            newFiveWhyCountmeassures.Verified = obj.Verified;
            newFiveWhyCountmeassures.ResponsibleEmployee = obj.ResponsibleEmployee;
            newFiveWhyCountmeassures.CompletedDate = obj.CompletedDate;
            newFiveWhyCountmeassures.PlannedDate = obj.PlannedDate;
            newFiveWhyCountmeassures.RootCausesNodeIds = obj.RootCausesNodeIds;
            newFiveWhyCountmeassures.ResponsibleEmployeeName = obj.ResponsibleEmployeeName;
            newFiveWhyCountmeassures.IsOfficialStandard = obj.IsOfficialStandard;
            newFiveWhyCountmeassures.Evidences = newEvidence;
            newFiveWhyCountmeassures.TypeCountermeasureId = obj.TypeCountermeasureId;
            newFiveWhyCountmeassures.CardRedId = obj.CardRedId;
            return newFiveWhyCountmeassures;
        }));
    }

    private sasTokenEvicence = async (evindences:Array<CountermeasureEvidence>) =>{
        return await Promise.all(evindences.map(async (obj)=>{
            let newCountermeasureEvidence:CountermeasureEvidence = {...new CountermeasureEvidence};
            newCountermeasureEvidence.BlobId = obj.BlobId;
            newCountermeasureEvidence.BlobUri = obj.BlobUri? await this.sastokenFullUrl(obj.BlobUri) : '';
            newCountermeasureEvidence.OriginalFileName = obj.OriginalFileName;
            newCountermeasureEvidence.EvidenceId = obj.EvidenceId;
            newCountermeasureEvidence.EvidenceTypeId = obj.EvidenceTypeId;
            return newCountermeasureEvidence;
        }));
    }

    public getEmployeeLabel = (employee: IEmployee) => {
        return `#${employee.id} (${employee.employeeNumber}) ${employee.name}`;
    };

    public getFiveWhyNodeLabel = (fiveWhyNode:FiveWhyNode) =>{
        return `Causa raíz ${fiveWhyNode.Id} / ${fiveWhyNode.Description && fiveWhyNode.Description.length > 15 ? fiveWhyNode.Description.substring(0,15): fiveWhyNode.Description}`;
    }

    public getDetailLabel = (fiveWhyNode: any) => {
        return `${fiveWhyNode.text}`;
    }
    public getFiveWhyNodeLabelType = (fiveWhyNode: any) => {
        return `Causa raíz ${fiveWhyNode.Id} / ${fiveWhyNode.Description && fiveWhyNode.Description.length > 15 ? fiveWhyNode.Description.substring(0, 15) : fiveWhyNode.Description}`;
    }
    public getEmployeeValue = (employee: IEmployee) => {
        return `${employee.id}`;
    };

    public getFiveWhyNodeValue = (fiveWhyNode:FiveWhyNode) => {
        return `${fiveWhyNode.Id}`;
    };
    public getDetailValue = (fiveWhyNode: any) => {
        return `${fiveWhyNode.id}`;
    };
    public getFiveWhyNodeType = (fiveWhyNode: any) => {
        return `${fiveWhyNode.CountermesureTypeId}`;
    };


    public filterEmployee = async (text: string) => {
        const notYetFilteredEmployees = await this.employeeService.getAll();
        return notYetFilteredEmployees.filter(x => {
            if (`${x.employeeNumber}`.indexOf(text.toLowerCase()) !== -1) return true;
            if (`${x.name}`.toLowerCase().indexOf(text.toLowerCase()) !== -1) return true;
            return false;
        });
    };

    public filterFiveWhyNode = async (text: string) => {
        const notYetFilterediveWhyCountmeassures = await this.counterMeasureService.getRootCauses(this.fiveWhyAnalysisId);
        return notYetFilterediveWhyCountmeassures.filter(x => {
            if (`${x.Id}`.indexOf(text.toLowerCase()) !== -1) return true;
            if (`${x.Description}`.toLowerCase().indexOf(text.toLowerCase()) !== -1) return true;
            return false;
        });
    };
    public filterDetails = async (text: string) => {
        return this.countermeasureTypeDetails.filter(x => {
            if (`${x.id}`.indexOf(text.toLowerCase()) !== -1) return true;
            if (`${x.text}`.toLowerCase().indexOf(text.toLowerCase()) !== -1) return true;
            return false;
        })
    }
    public countermeasureTypeDetails =  [
            {
                id: CountermeasureTypeDetail.Instruction,
                text: 'Instrucción'
            },
            {
                id: CountermeasureTypeDetail.VisualSupport,
                text: 'Ayuda Visual'
            },
            {
                id: CountermeasureTypeDetail.Signal,
                text: 'Señal/Alarma'
            },
            {
                id: CountermeasureTypeDetail.Pokayoke,
                text: 'Pokayoke'
            },
        ];
    
    public handleResponsibleEmployeeChange = (event:any[])=>{
       this.fiveWhyCountmeassure.ResponsibleEmployee = event;
    }

    public handleResponsibleEmployeeValidateChange = (event:any[])=>{
        this.ResponsibleEmployeeValidate = event;
     }

    public handleFiveWhyNodeChange = (event:any[])=>{
        this.fiveWhyCountmeassure.RootCausesNodeIds = event;
    }

    public handleDetailChange = (event: any) => {
        console.log("cambio", event);
        this.fiveWhyCountmeassure.TypeCountermeasureId = event.id;
        this.component.forceUpdate();
    }
    public handleFiveWhyNodeTypeChange = (event: any[]) => {
        this.fiveWhyCountmeassure.RootCausesNodeIds = event;
    }

    public handleDescriptionChange=(event: React.ChangeEvent<HTMLTextAreaElement>)=>{
        this.fiveWhyCountmeassure.CountermeassureDescription = event.currentTarget.value;
        this.component.forceUpdate();
    }

    public handleSaveCountermeasureOnClick = async (event:React.MouseEvent<HTMLAnchorElement>)=>{
        event.preventDefault();
        let bePush:boolean = true;
        this.isSaveCounterMeasure = true;
        if(this.fiveWhyCountmeassure.Id){
            bePush = false;
        }
        try {
            if (this.countermeassureTypeId != null) {
                this.fiveWhyCountmeassure.countermeassureTypeId = this.countermeassureTypeId;
            }
            if (this.countermeassureTypeId == 1) {
                this.fiveWhyCountmeassure.TypeCountermeasureId = this.details.length > 0 ? this.details[0].id : null;
                
                this.fiveWhyCountmeassure.CardRedId = undefined;
            }
            if (this.countermeassureTypeId == 2) {
                this.fiveWhyCountmeassure.TypeCountermeasureId = undefined;
            }
            this.fiveWhyCountmeassure.PlannedDate = this.PlannedDateValidate ? this.PlannedDateValidate : new Date();
            if (this.rcfaBdaClientForm.Id) {
                this.fiveWhyCountmeassure.IdRcfa = this.rcfaBdaClientForm.Id;
            }
            this.fiveWhyCountmeassure.TypeRcfa = 'bda';
            let newFiveWhyCountmeassureWithoutSas = await this.counterMeasureService.setFiveWhyCountmeassure(this.fiveWhyAnalysisId, 
                    this.fiveWhyCountmeassure);
            if(bePush){
                let newArrayWithoutSasToken:Array<FiveWhyCountmeassure> = [];
                newArrayWithoutSasToken.push(newFiveWhyCountmeassureWithoutSas);
                let newArrayWithSasToken = await this.sasToken(newArrayWithoutSasToken);
                let newFiveWhyCountmeassureWithSasToken = newArrayWithSasToken[0];
                this.fiveWhyCountmeassures.push(newFiveWhyCountmeassureWithSasToken);
            }
            this.closeModal(null);
        } catch (error) {
            this.handleError(error);
            throw error;
        }
        finally {
            this.isSaveCounterMeasure = false;
        }
    }

    public handlerDeleteCountermeasure = async(event:React.MouseEvent<HTMLButtonElement>)=>{
        event.preventDefault();
        this.disableBtn('counterDelete',0);
        if(this.fiveWhyCountmeassure.Id){
            await this.counterMeasureService.deleteFiveWhyCountermeassure(this.fiveWhyAnalysisId, this.fiveWhyCountmeassure.Id);
            this.fiveWhyCountmeassures = await this.counterMeasureService.getFiveWhyCountmeassure(this.fiveWhyAnalysisId);
            this.disableBtn('counterDelete',1);
        }
       
        this.closeModal(null);
    }

    public handleFillFiveWhyNode = (event:React.MouseEvent<HTMLDivElement>, fiveWhyCountmeassure:FiveWhyCountmeassure)=>{
        event.preventDefault();
        this.modelStateErrors = null;
        this.modalTitle = "Contramedida";
        this.fiveWhyCountmeassure = fiveWhyCountmeassure;
        this.countermeassureTypeId = fiveWhyCountmeassure.TypeCountermeasureId != null ? 1 : fiveWhyCountmeassure.CardRedId != null ? 2 : null;
        if (this.countermeassureTypeId == 1) {
            this.details.push(this.countermeasureTypeDetails.find(x => x.id == fiveWhyCountmeassure.TypeCountermeasureId));
        }
        setTimeout(this.openModalCountermeasure(),100)
        this.component.forceUpdate();
    }

    public handleShowValidatorModal = (event:React.MouseEvent<HTMLButtonElement>, fiveWhyCountmeassureId?:number)=>{
        event.stopPropagation();
        event.preventDefault();
        
        if(fiveWhyCountmeassureId){
            this.modelStateErrors = null;
            this.fiveWhyCountmeassureId = fiveWhyCountmeassureId;
            this.DateValidate = null;
            this.PlannedDateValidate = null;
            this.ResponsibleEmployeeValidate = [];
            this.openModalvalidation();
        }  
    }
    public isDelayed = (counter: FiveWhyCountmeassure) => {
        let now = new Date();
        if (counter.PlannedDate != null) {
            let date = new Date(counter.PlannedDate);
            console.log(date, now);
            let diff = now.getTime() - date.getTime();
            let diffDays = diff / (1000 * 60 * 60 * 24)
            console.log(diffDays);
            if (diffDays > 1) {
                return true;
            } else {
                return false
            }
        } else {
            return true;
        }
    }
    public handleSaveValidate = async (event:React.MouseEvent<HTMLButtonElement>)=>{
        event.preventDefault();
        try {
            this.isSaveValidation = true;
            if(this.fiveWhyCountmeassureId){
                let ResponsibleEmployeeValidateId:number|null = null;
                if(this.ResponsibleEmployeeValidate && this.ResponsibleEmployeeValidate.length > 0){
                    ResponsibleEmployeeValidateId = this.ResponsibleEmployeeValidate[0].id;
                }
                await this.counterMeasureService.postValidateFiveWhyCountermeassure(this.fiveWhyAnalysisId, this.fiveWhyCountmeassureId, this.DateValidate, ResponsibleEmployeeValidateId);
                this.fiveWhyCountmeassures.map((countermeasure)=>{
                    if(countermeasure.Id != null){
                        countermeasure.Id == this.fiveWhyCountmeassureId ? countermeasure.Verified = true : null;
                    }
                });
            }
            this.fiveWhyCountmeassures = await this.counterMeasureService.getFiveWhyCountmeassure(this.fiveWhyAnalysisId);
            let pendients = this.fiveWhyCountmeassures.filter(x => !x.Verified);
            this.closeModal(null);
            this.component.forceUpdate();
            if (pendients.length == 0) {
                await this.handleFormSubmit(true);
                location.reload();
            }
        }
        catch(error) {
            this.handleError(error);
            throw error;
        }finally {
            this.isSaveValidation = false;
        }
    }

    public newCountermeasure = (event: React.MouseEvent<HTMLButtonElement>) =>{
        this.modalTitle = "Nueva contramedida";
        event.preventDefault();
        this.modelStateErrors = null;
        this.fiveWhyCountmeassure = new FiveWhyCountmeassure;
        this.openModalCountermeasure();
    }

    private reportDateChange = (event: any) => {
        this.DateValidate = moment(this.getIsoDateFromWeirdMaterializeCssJQueryEvent(event)).toDate();
    }

    private plannedDateChange = (event: any) => {
        this.PlannedDateValidate = moment(this.getIsoDateFromWeirdMaterializeCssJQueryEvent(event)).toDate();
    }

    public formatIds = (fiveWhyNodes:Array<FiveWhyNode>):string =>{
        return fiveWhyNodes.map((fiveWhyNode:FiveWhyNode, index:number)=>{
            return fiveWhyNode.Id
        }).join(", ");

    }
    public formatResponsables = (employees: Array<any>): string => {
        return employees.map((fiveWhyNode: any, index: number) => {
            return fiveWhyNode.name
        }).join(", ");

    }

    private getIsoDateFromWeirdMaterializeCssJQueryEvent(weirdEvent: any): string {
        const eventData = (weirdEvent.originalEvent as any).firedBy;
        if (!eventData) return '';
        const date = eventData.date as Date | null;
        return date ? moment(date).format(ISO_SHORT_DATE_FORMAT) : '';
    }

    private handleError(error: Error) {
        const axiosError = this.getAxiosError(error);
        if (!axiosError.response || !axiosError.response.data) {
            return;
        }

        const modelStateErrors = axiosError.response.data as IModelStateError;

        if (axiosError.response.status) {
            modelStateErrors.Message = 'Uno o mas campos requeridos están vacios.';
        }

        if (!modelStateErrors.Message || !modelStateErrors.ModelState) {
            return;
        }
        console.log(modelStateErrors)
        this.modelStateErrors = modelStateErrors;
    }

    public validationMessageFor(field:string){
        if(this.modelStateErrors === null || !this.modelStateErrors.ModelState){
            return null;
        }
        let message = null;
        if (this.modelStateErrors.ModelState[field]) {
            message = this.modelStateErrors.ModelState[field];
        }else if(this.modelStateErrors.ModelState[`model.${field}`]){
            message = this.modelStateErrors.ModelState[`model.${field}`];
        }
        
        return message;
    }

    public handleFormSubmit = async (changeState:boolean) => {
        const controller = new UIAlertController<void>("Aviso", "Se están procesando los datos", UIAlertControllerStyle.alert);
        const closeBlocker = DialogRenderer.PresentBlocker(controller);

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

    public handleEvidenciasUpload = (file:FileUploadModel, obj:any) =>{
        if (!file.blob)
            return;

        let newEvidence = new CountermeasureEvidence();
        newEvidence.BlobId = file.blob.id;
        newEvidence.BlobUri = file.sasToken;
        newEvidence.EvidenceTypeId = 1;
        newEvidence.OriginalFileName = file.FileName || "";
        this.fiveWhyCountmeassure.Evidences.push(newEvidence);

        this.component.forceUpdate();
    }

    private disableBtn (btnId:string,status:number){
        let btn = $("#"+btnId);
        status == 0 ? 
            btn.addClass("disabled"):
            btn.removeClass("disabled");
    }

    public handleAdjuntosUpload = (file:FileUploadModel, obj:any) =>{
        if (!file.blob)
            return;

        let newEvidence = new CountermeasureEvidence();
        newEvidence.BlobId = file.blob.id;
        newEvidence.BlobUri = file.sasToken;
        newEvidence.EvidenceTypeId = 2;
        newEvidence.OriginalFileName = file.FileName || "";

        this.fiveWhyCountmeassure.Evidences.push(newEvidence);
        this.component.forceUpdate();
    }

    public handleDownloadFile = async (event:React.MouseEvent<HTMLButtonElement>, file:CountermeasureEvidence) => {
        event.preventDefault();
        if(file.BlobUri){
            window.open(await this.sastokenFullUrl(file.BlobUri), '_blank');
        }
    }

    private async sastokenFullUrl(originalBlobURl:string):Promise<string>{
        var blobUri = new URL(originalBlobURl);
        var splitedUri =  blobUri.pathname.split("/");
        var containerName = splitedUri[1];
        let blobName = splitedUri[splitedUri.length -1];
        if (blobName == null || typeof(blobName) === "undefined" || blobName == "") {
            blobName = splitedUri[splitedUri.length -2];
        }

        let sasToken = await this.azureStorageService.getBlobSasToken(containerName, blobName);
        return sasToken.resource + sasToken.token;
    }

    public SetClientForm(form: RcfaBdaClientForm) {
        this.rcfaBdaClientForm = form;
    }

    public downloadFile = (event:React.MouseEvent<HTMLButtonElement>, file:CountermeasureEvidence) => {
        if(file.BlobUri){
            var requestXhr = new XMLHttpRequest();
            requestXhr.open("GET", file.BlobUri);
            requestXhr.responseType = "blob";
            requestXhr.onload = function (event) {
                if (requestXhr.status == 200) {
                    var blob = requestXhr.response;
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.target = "_blank";
                    link.download = file.OriginalFileName;
                    link.click();
                } else {
                    alert(requestXhr.status);
                }
            };
            requestXhr.send();
        }
    }
    public isCardSelected = (card: any) => {
        return this.selectedCards.filter(s => s.Id == card.Id).length > 0;
    };
    public handleOnCardSelectionChange = (event: ChangeEvent<HTMLInputElement>, card: any) => {
        this.selectedCards = [];
        if (event.currentTarget.checked) {
            this.selectedCards.push(card);
        } else {
            this.selectedCards = this.selectedCards.filter(s => s.Id != card.Id);
        }
    };
    public get SelectedCards() {
        return this.selectedCards;
    }
    public onCountermeassureTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
        this.countermeassureTypeId = +event.currentTarget.value;
    };
    public handleTotalFalureTimeHoursChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        this.fiveWhyCountmeassure.TypeCountermeasureId = parseInt(event.target.value);
    }
    public handleChangeCardRed = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log(event)
        if (event.target.value != null) {
            this.fiveWhyCountmeassure.CardRedId = parseInt(event.target.value);
            this.component.forceUpdate();
        }
    }
}