import * as $ from 'jquery';
import {observable} from "mobx";
import * as moment from "moment";
import { AxiosError } from "axios";
import AnalyticsPage from "./bda-analytics-page"
import {RcfaBdaClientForm} from "../../../../models/rcfa-bda-form";
import FiveWhyAnalysis from "../../../../models/five-why-analysis"
import RcfaBdaService from "../../../../services/rfca-bda-service";
import RootCauseAnalyzer from "../../../common/root-cause-analyzer/root-cause-analyzer"
import UIAlertController from '../../../../lib/custom-dialogs/core/ui-alert-controller';
import DialogRenderer from '../../../../lib/custom-dialogs/components/dialog-renderer/dialog-renderer';
import { IModelStateError } from '../../../../models/i-model-state-error';
import { UIAlertControllerStyle } from '../../../../lib/custom-dialogs/core/ui-alert-controller-style';
import { ISO_SHORT_DATE_FORMAT, MATERIALIZE_SETTINGS } from '../../../../config/theme';
import IEmployee from '../../../../models/i-employee';
import EmployeeService from '../../../../services/employee-service';

export default class BdaAnalyticsLogic {

    @observable
    public rcfaBdaClientForm: RcfaBdaClientForm = {...new RcfaBdaClientForm()}

    @observable 
    public fiveWhyAnalysis:FiveWhyAnalysis|null = null;

    @observable
    public modelStateErrors:IModelStateError|null = null;

    @observable
    public AnaliticsPeopleEmployee: IEmployee[] = [];

    public rootCauseAnalyzer:RootCauseAnalyzer|null = null;

    private rcfaBdaService: RcfaBdaService;
    private employeeService: EmployeeService;


    constructor(rcfaBdaClientForm: RcfaBdaClientForm, private component:AnalyticsPage){
        this.rcfaBdaClientForm = rcfaBdaClientForm;
        this.employeeService = new EmployeeService();
        this.rcfaBdaService = new RcfaBdaService();
    }

    public async onComponentDidMount() {
        try {
            this.initializeMaterial();
            if(!this.rcfaBdaClientForm.FiveWhyAnalysisId){
                this.fiveWhyAnalysis = await this.rcfaBdaService.createFiveWhy(null);
                this.rcfaBdaClientForm.FiveWhyAnalysisId = this.fiveWhyAnalysis.Id;
                this.rcfaBdaClientForm = await this.rcfaBdaService.createBda(this.rcfaBdaClientForm);
                if(this.rootCauseAnalyzer){
                    this.rootCauseAnalyzer.logic.fiveWhyAnalysis = this.fiveWhyAnalysis;
                }
            }else{
                this.fiveWhyAnalysis = await this.rcfaBdaService.getFiveWhyAnalysis(this.rcfaBdaClientForm.FiveWhyAnalysisId);
                if(this.rootCauseAnalyzer){
                    this.rootCauseAnalyzer.logic.fiveWhyAnalysis = this.fiveWhyAnalysis;
                }
            }
        } catch (error) {
            // Ignore
        }
    };

    private initializeMaterial = () => {
        ($('select.material-opt-in') as any).formSelect();
        const datePickerSettings = {
            maxDate: new Date(),
            defaultDate: this.rcfaBdaClientForm.AnalyticsDate? this.rcfaBdaClientForm.AnalyticsDate :  new Date(),
            setDefaultDate: true,
            todayBtn: true,
            i18n: MATERIALIZE_SETTINGS.datepicker.i18n.spanish
        };
        $('#AnalyticsDate.datepicker').on('change', this.handleAnalyticsDateChange).datepicker(datePickerSettings);
    };

    private handleAnalyticsDateChange = (event: any) => {
        this.rcfaBdaClientForm.AnalyticsDate = moment(this.getIsoDateFromWeirdMaterializeCssJQueryEvent(event)).format(ISO_SHORT_DATE_FORMAT);
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
                this.rcfaBdaClientForm.AnaliticsPeople = this.AnaliticsPeopleEmployee;
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

        this.modelStateErrors = modelStateErrors;
    }

    private getIsoDateFromWeirdMaterializeCssJQueryEvent(weirdEvent: any): string {
        const eventData = (weirdEvent.originalEvent as any).firedBy;
        if (!eventData) return '';
        const date = eventData.date as Date | null;
        return date ? moment(date).format(ISO_SHORT_DATE_FORMAT) : '';
    }

    private getAxiosError(error: Error): AxiosError {
        return error as AxiosError;
    }

    public getEmployeeLabel = (employee: IEmployee) => {
        return `#${employee.id} (${employee.employeeNumber}) ${employee.name}`;
    };

    public getEmployeeValue = (employee: IEmployee) => {
        return `${employee.id}`;
    };

    public filterEmployee = async (text: string) => {
        const notYetFilteredEmployees = await this.employeeService.getAll();
        return notYetFilteredEmployees.filter(x => {
            if (`${x.employeeNumber}`.indexOf(text.toLowerCase()) !== -1) return true;
            if (`${x.name}`.toLowerCase().indexOf(text.toLowerCase()) !== -1) return true;
            return false;
        });
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

    public SetClientForm(form: RcfaBdaClientForm) {
        this.rcfaBdaClientForm = form;
        this.AnaliticsPeopleEmployee = this.rcfaBdaClientForm.AnaliticsPeople? this.rcfaBdaClientForm.AnaliticsPeople : [];
    }

    public updateDimensions(){
        if(this.rootCauseAnalyzer){
            this.rootCauseAnalyzer.logic.initialConnection();
        }
    }
    
}