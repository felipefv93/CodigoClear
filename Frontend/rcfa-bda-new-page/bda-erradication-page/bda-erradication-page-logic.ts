import * as $ from 'jquery';
import { observable } from 'mobx';
import RcfaBdaService from '../../../../services/rfca-bda-service';
import { RcfaBdaClientForm } from '../../../../models/rcfa-bda-form';
import FiveWhyCountmeassure from '../../../../models/five-why-countermeassure';

export default class BdaErradicationPageLogic {
    private rcfaBdaService: RcfaBdaService;
    @observable 
    public rcfaBdaClientForm: RcfaBdaClientForm = {...new RcfaBdaClientForm()}

    @observable 
    public countermeasureList:Array<FiveWhyCountmeassure> = [];

    @observable 
    public currentCountermeasure:FiveWhyCountmeassure = new FiveWhyCountmeassure();

    @observable
    public isLoading:boolean = false;

    constructor(rcfaBdaClientForm:RcfaBdaClientForm){
        this.rcfaBdaService = new RcfaBdaService();
        this.rcfaBdaClientForm = rcfaBdaClientForm;
    }

    public openModal =(countermeasure:FiveWhyCountmeassure)=>{
        this.currentCountermeasure = countermeasure;
        ($('.modalErradication') as any).modal('open');
    }

    public closeModal =(event:React.MouseEvent<HTMLButtonElement>|null)=>{
        if(event){
            event.preventDefault();
        }
        this.currentCountermeasure = new FiveWhyCountmeassure();
        ($('.modalErradication') as any).modal('close');
    }

    private initializeMaterial = ()=>{
        ($('#modalErradication.modal') as any).modal({
            dismissible:false
        });
    }

    public SetClientForm(form: RcfaBdaClientForm) {
        this.rcfaBdaClientForm = form;
    }

    public async onComponentDidMount(bdaFormId?:number) {
        this.initializeMaterial();
        try{
            this.isLoading = true;
            if (this.rcfaBdaClientForm.FiveWhyAnalysisId)
                this.countermeasureList = await this.rcfaBdaService.getCountermeasureErradication(bdaFormId);
        }catch(err){
            this.countermeasureList = [];
        }finally{
            this.isLoading = false;
        }
    };
}