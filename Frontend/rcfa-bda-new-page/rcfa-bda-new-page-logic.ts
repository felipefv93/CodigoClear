import {observable} from "mobx";
import * as $ from 'jquery';
import { RcfaBdaClientForm } from "../../../models/rcfa-bda-form";
import RcfaDasNewPage from "./rcfa-bda-new-page";
import DescriptionPage from './bda-description-page/bda-description-page';
import RestoringPage from './bda-restoring-page/bda-restoring-page';
import UIAlertController from "../../../lib/custom-dialogs/core/ui-alert-controller";
import { UIAlertControllerStyle } from "../../../lib/custom-dialogs/core/ui-alert-controller-style";
import DialogRenderer from "../../../lib/custom-dialogs/components/dialog-renderer/dialog-renderer";
import AnalyticsPage from "./bda-analytics-page/bda-analytics-page";
import CountermeasurePage from "./bda-countermeasure-page/bda-countermeasure-page";
import MonitoringPage from "./bda-monitoring-page/bda-monitoring-page";
import ErradicationPage from "./bda-erradication-page/bda-erradication-page";
import RcfaBdaService from "../../../services/rfca-bda-service";
import CounterMeasureService from "../../../services/counter-measure-service";
import UIAlertAction from "../../../lib/custom-dialogs/core/ui-alert-action";
import { UIAlertActionStyle } from "../../../lib/custom-dialogs/core/ui-alert-action-style";

export default class RcfaBdaNewPageLogic {
    private changeSate:boolean = false;
    private rcfaBdaService:RcfaBdaService;
    private counterMeasureService:CounterMeasureService;

    @observable
    public rcfaBdaClientForm: RcfaBdaClientForm = {...new RcfaBdaClientForm()}
    @observable public AllCountermeasureValidated: boolean = false;
    @observable
    public id?: number|null;
    @observable 
    public descriptionPage: DescriptionPage|null = null;
    @observable
    public restoringPage: RestoringPage|null = null;
    @observable
    public analyticPage: AnalyticsPage|null = null;
    @observable
    public countermeasurePage: CountermeasurePage|null = null;
    @observable
    public monitoringPage: MonitoringPage|null = null;
    @observable
    public standarsPage: ErradicationPage|null = null;
    @observable
    public component?:RcfaDasNewPage|null = null;
    @observable
    public currentName:string = 'Descripción';

    constructor(id?: number|null, component?:RcfaDasNewPage) {
        this.id = id;
        this.component = component;
        this.rcfaBdaService = new RcfaBdaService;
        this.counterMeasureService = new CounterMeasureService();
    }

    public currentStatusName = (currentStateId:number|undefined|null) =>{
        if(currentStateId){
            switch(currentStateId){
                case 1:
                    this.currentName = "Descripción";
                break;
                case 2:
                    this.currentName = "Restauración";
                break;
                case 3:
                    this.currentName = "Análisis";
                break;
                case 4:
                    this.currentName = "Contramedidas";
                break;
                case 5:
                    this.currentName = "Seguimiento";
                break;
                case 6:
                    this.currentName = "Estandarización";
                break;
                default:
                    this.currentName = "Descripción";
                break;
            }
        }
    }
    
    public changeCurrentTab = (nameTab:string|undefined|null, currentStateId:number|undefined|null)=>{
        if(!nameTab && currentStateId){ 
            let tabs = document.querySelectorAll(".tabAnyBda");
            for(let x= 0; x>= tabs.length; x++){
                (tabs[x] as HTMLElement).style.display = "none";
            }

            let tab:any|null;

            switch(currentStateId){
                case 1:
                    tab = document.querySelector("#bdaDescriptionContent");
                    if(tab){
                        (tab as HTMLElement).style.display = "block";
                    }
                    (document.querySelector("#bdaDescriptionAnchoreTag")as HTMLElement).click();
                break;
                case 2:
                    tab = document.querySelector("#bdarestoring");
                    if(tab){
                        (tab as HTMLElement).style.display = "block";
                    }
                    (document.querySelector("#bdaRestoringAnchoreTag")as HTMLElement).click();
                break;
                case 3:
                    tab = document.querySelector("#bdaanalytics");
                    if(tab){
                        (tab as HTMLElement).style.display = "block";
                    }
                    (document.querySelector("#bdaAnalyticsAnchoreTag")as HTMLElement).click();
                break;
                case 4:
                    tab = document.querySelector("#bdacountermeasure");
                    if(tab){
                        (tab as HTMLElement).style.display = "block";
                    }
                    (document.querySelector("#bdaCountermeasureAnchoreTag")as HTMLElement).click();
                break;
                case 5:
                    tab = document.querySelector("#bdamonitoring");
                    if(tab){
                        (tab as HTMLElement).style.display = "block";
                    }
                    (document.querySelector("#bdaMonitoringAnchoreTag")as HTMLElement).click();
                break;
                case 6:
                    tab = document.querySelector("#bdastandards");
                    if(tab){
                        (tab as HTMLElement).style.display = "block";
                    }
                    (document.querySelector("#bdaStandardsAnchoreTag")as HTMLElement).click();
                break;
                default:
                    tab = document.querySelector("#bdaDescriptionContent");
                    if(tab){
                        (tab as HTMLElement).style.display = "block";
                    }
                    (document.querySelector("#bdaDescriptionAnchoreTag")as HTMLElement).click();
                break;
            }
        }

    }

    public async onComponentDidMount() {
        if(!this.id){
            this.rcfaBdaClientForm = {...new RcfaBdaClientForm()};
            this.rcfaBdaClientForm.isEdit = false;

        }
        else {
            const controller = new UIAlertController<void>("Aviso", "Se están procesando los datos", UIAlertControllerStyle.alert);
            const closeBlocker = DialogRenderer.PresentBlocker(controller);
            this.rcfaBdaClientForm = await this.rcfaBdaService.getBdaForm(this.id);
            this.rcfaBdaClientForm.isEdit = true;
            closeBlocker();
            if(this.descriptionPage){
                this.descriptionPage.logic.SetClientForm(this.rcfaBdaClientForm);
            }
            if(this.restoringPage){
                this.restoringPage.logic.SetClientForm(this.rcfaBdaClientForm);
            }

            if(this.analyticPage){
                this.analyticPage.logic.SetClientForm(this.rcfaBdaClientForm);
            }

            if(this.countermeasurePage){
                this.countermeasurePage.logic.SetClientForm(this.rcfaBdaClientForm);
            }

            if(this.monitoringPage){
                this.monitoringPage.logic.SetClientForm(this.rcfaBdaClientForm);
            }
            
            if(this.standarsPage){
                this.standarsPage.logic.SetClientForm(this.rcfaBdaClientForm);
            }

            this.changeCurrentTab(null, this.rcfaBdaClientForm.CurrentBdaStateId);
        }
        
        this.currentStatusName(this.rcfaBdaClientForm.CurrentBdaStateId);
        try {           
            this.initializeMaterial();
        } finally {
            if (this.component){
                this.component.forceUpdate();
            }
        }

        
    };

    public onComponentDidUpdate() {
        ($('.tabs')as any).tabs();
    }

    private initializeMaterial = () => {
        ($('.tabs')as any).tabs({ onShow: this.chancheTab() });
    };

    public chancheTab(){
        if (this.component) this.component.forceUpdate()
    }
    
    public save = async(event: React.MouseEvent<HTMLAnchorElement>)=>{
        event.preventDefault();
        try{
            this.disableBtn('btnSaveDas',0);
            this.changeSate = false;
            await this.saveFormSubmit();
        }catch(err){
            console.log(err);
        }finally{
            this.disableBtn('btnSaveDas',1);
        }
        
    }
    public finishConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const controller = new UIAlertController<void>("Aviso", "¿Deseas pasar a la siguiente etapa?",
            UIAlertControllerStyle.actionSheet, "fa-exclamation-triangle");

        controller.addAction(new UIAlertAction("Si", UIAlertActionStyle.default, () => this.finish()));
        controller.addAction(new UIAlertAction("Cancelar", UIAlertActionStyle.cancel, () => 0));
        DialogRenderer.PresentAlert(controller);
    }
    public finish = async()=>{
        
        try{
            this.disableBtn('btnFinishDas',0);
            this.changeSate = true;
            await this.saveFormSubmit();
        }catch(err){
            console.log(err)
        }finally{
            this.disableBtn('btnFinishDas',1);
        }
    }
    
    private disableBtn (btnId:string,status:number){
        let btn = $("#"+btnId);
        status == 0 ? 
            btn.addClass("disabled"):
            btn.removeClass("disabled");
    }

    public Message(mesagge:string){
        const controller = new UIAlertController<void>('Su reporte no podrá avanzar de status', 
            'Su reporte será guardado; sin embargo para poder avanzar, revise los siguientes puntos: \n\r' + mesagge, 
            UIAlertControllerStyle.alert);
        DialogRenderer.PresentAlert(controller);
    }

    public saveFormSubmit = async () => {
        let cambio = true;
        let isEdit = false;
        let currentStateId = this.rcfaBdaClientForm.CurrentBdaStateId || 1;
        if (this.rcfaBdaClientForm.isEdit && this.rcfaBdaClientForm.EditStageId !== undefined) {
            console.log("GUARDAR EDICION:::", this.rcfaBdaClientForm);
            currentStateId = this.rcfaBdaClientForm.EditStageId;
            isEdit = true;
        }
        switch(currentStateId){
            case 1:
                if(this.descriptionPage){
                    this.rcfaBdaClientForm = await this.descriptionPage.handleFormSubmit(this.changeSate);
                }
            break;
            case 2:
                if(this.restoringPage){
                    this.rcfaBdaClientForm = await this.restoringPage.handleFormSubmit(this.changeSate);
                }
            break;
             case 3:
                 if(this.analyticPage){
                     this.rcfaBdaClientForm = await this.analyticPage.handleFormSubmit(this.changeSate);
                }
            break;
             case 4:
                if(this.countermeasurePage){
                    this.rcfaBdaClientForm = await this.countermeasurePage.handleFormSubmit(this.changeSate);
                    if (this.rcfaBdaClientForm.FiveWhyAnalysisId) {
                        const responseAllCountermeasureState = await this.counterMeasureService.getFiveWhyCountmeassure(this.rcfaBdaClientForm.FiveWhyAnalysisId)
                        const values = responseAllCountermeasureState.filter(a => a.Verified == false)
                        if(values.length){
                            this.AllCountermeasureValidated = false;
                        } else {
                            this.AllCountermeasureValidated = true;
                        }
                    }
                 }
            break;
        }
        if (isEdit) {
            this.rcfaBdaClientForm.isEdit = true;
            this.rcfaBdaClientForm.EditStageId = undefined;
        }
        if (this.descriptionPage) {

            this.descriptionPage.logic.rcfaBdaClientForm = this.rcfaBdaClientForm;
        }

        if(this.restoringPage){
            this.restoringPage.logic.rcfaBdaClientForm = this.rcfaBdaClientForm;
            await this.restoringPage.logic.obtenerSasToken();
        }

        if(this.analyticPage){
            this.analyticPage.logic.rcfaBdaClientForm = this.rcfaBdaClientForm;
        }

        if(this.countermeasurePage){
            this.countermeasurePage.logic.rcfaBdaClientForm = this.rcfaBdaClientForm;
        }

        if(this.monitoringPage){
            this.monitoringPage.logic.SetClientForm(this.rcfaBdaClientForm);
        }

        if (this.changeSate == false && !this.rcfaBdaClientForm.CanGoToNextState) {
            var errorList = this.rcfaBdaClientForm.Observations;
            let result:string = "";
            if (errorList){
                cambio = false;
                result = errorList.join("\n\r");
                this.Message(result);
            }
        }
        
        if(cambio){
            this.changeCurrentTab(null, this.rcfaBdaClientForm.CurrentBdaStateId);
        }

    }

    public HandlerClickTabDescription = async(event: React.MouseEvent<HTMLAnchorElement>)=>{
        this.currentName = "Descripción";
    }

    public HandlerClickTabRestoring = async(event: React.MouseEvent<HTMLAnchorElement>)=>{
        this.currentName = "Restauración";
    }

    public HandlerClickTabAnalytics = async(event: React.MouseEvent<HTMLAnchorElement>)=>{
        this.currentName = "Análisis";
        if(this.analyticPage){
            this.analyticPage.logic.updateDimensions();
        }
    }

    public HandlerClickTabCountermeasure = async(event: React.MouseEvent<HTMLAnchorElement>)=>{
        this.currentName = "Contramedidas";
    }

    public HandlerClickTabMonitoring = async(event: React.MouseEvent<HTMLAnchorElement>)=>{
        this.currentName = "Seguimiento";
    }

    public HandlerClickTabStandars = async(event: React.MouseEvent<HTMLAnchorElement>)=>{
        this.currentName = "Estandarización";
    }
}