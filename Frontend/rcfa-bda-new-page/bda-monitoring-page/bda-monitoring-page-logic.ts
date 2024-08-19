import * as $ from 'jquery';
import { observable } from 'mobx';
import RcfaBdaService from "../../../../services/rfca-bda-service";
import { RcfaBdaClientForm, MonitoringWeek, MonitoringRecurrencesEmployer, RecurrenceUserData } from '../../../../models/rcfa-bda-form';
import { MATERIALIZE_SETTINGS } from '../../../../config/theme';
import EmployeeService from '../../../../services/employee-service';
import IEmployee from '../../../../models/i-employee';
import * as moment from 'moment';
import { ISO_SHORT_DATE_FORMAT } from "../../../../config/theme";
import BdaMonitoringPage from './bda-monitoring-page';

export default class BdaMonitoringLogic {
    private rcfaBdaService: RcfaBdaService;
    private employeeService: EmployeeService;
    @observable public DetectedByEmployee: IEmployee[] = [];
    @observable public monitoringList:Array<MonitoringWeek> = [];
    @observable public DetectedByEmployeeId:number = -1;
    @observable public monitoringEmployeeList:Array<MonitoringRecurrencesEmployer> = [];
    @observable public hasDateError:boolean = false;
    @observable public hasEmployeeError:boolean = false;
    @observable public rcfaBdaId?:number;

    @observable 
    public isLoanding:boolean = false;

    @observable
    public isSaveCurrence:boolean = false;
    
    @observable 
    public rcfaBdaClientForm: RcfaBdaClientForm = {...new RcfaBdaClientForm()};
    
    @observable 
    public UserRecurrence: RecurrenceUserData = {... new RecurrenceUserData()};

    @observable
    public component?:BdaMonitoringPage|null = null;

    private problemDate:Date|null = new Date();

    constructor(rcfaBdaClientForm: RcfaBdaClientForm, rcfaBdaId?:number, component?:BdaMonitoringPage){
        this.rcfaBdaClientForm = rcfaBdaClientForm;
        this.rcfaBdaService = new RcfaBdaService();
        this.rcfaBdaId = rcfaBdaId;
        this.employeeService = new EmployeeService();
        this.component = component;
    }

    public onComponentDidMount = async() =>{
        try {
            this.isLoanding = true;
            this.initializeMaterial();
            if(!(this.rcfaBdaId == null || this.rcfaBdaId == void 0 ||  this.rcfaBdaId == undefined)){
                this.getMonitoringWeekList();
                this.monitoringEmployeeList = await this.rcfaBdaService.getRecurrencesMonitoringEmployee(this.rcfaBdaId?this.rcfaBdaId:void 0);
            }
        } catch (error) {
            console.log(error)
        } finally{
            this.isLoanding = false;
        }
    };
    public getMonitoringWeekList = async() =>{
        this.monitoringList = await this.rcfaBdaService.getRecurrencesMonitoring(this.rcfaBdaId?this.rcfaBdaId:void 0);
    }
    
    public getEmployeeLabel = (employee: IEmployee) => {
        return `#${employee.id} (${employee.employeeNumber}) ${employee.name}`;
    };

    public getEmployeeValue = (employee: IEmployee) => {
        return `${employee.id}`;
    };

    public handleDetectedByEmployeeIdChange = (event: any) => {
        this.DetectedByEmployeeId = event[0].id;
    };

    public filterEmployee = async (text: string) => {
        const notYetFilteredEmployees = await this.employeeService.getAll();
        return notYetFilteredEmployees.filter(x => {
            if (`${x.employeeNumber}`.indexOf(text.toLowerCase()) !== -1) return true;
            if (`${x.name}`.toLowerCase().indexOf(text.toLowerCase()) !== -1) return true;
            return false;
        });
    };

    private checkParams =()=>{
        if(this.UserRecurrence.MarkedByEmployeeId == null || this.UserRecurrence.MarkedByEmployeeId == undefined || this.UserRecurrence.MarkedByEmployeeId == -1 || !this.UserRecurrence.MarkedByEmployeeId){
            this.hasEmployeeError = true;
        }else{
            this.hasEmployeeError = false;
        }
        if(this.UserRecurrence.MarkedAtDate == null || this.UserRecurrence.MarkedAtDate == undefined || this.UserRecurrence.MarkedAtDate == "" || !this.UserRecurrence.MarkedAtDate){
            this.hasDateError = true;
        }else{
            this.hasDateError = false;
        }
    }

    public setRecurrence = async()=>{
        this.isSaveCurrence = true;
        if(this.problemDate)
        this.UserRecurrence.MarkedAtDate = moment(this.problemDate).format('YYYY-MM-DD')
        console.log("mar2262001", this.UserRecurrence.MarkedAtDate);
        this.UserRecurrence.MarkedByEmployeeId = this.DetectedByEmployeeId;
        this.checkParams();
        try{
            if(this.hasDateError || this.hasEmployeeError){
                return;
            }
            let response:MonitoringRecurrencesEmployer = {... new MonitoringRecurrencesEmployer};
            response = await this.rcfaBdaService.isReccurence(this.UserRecurrence,
                (this.rcfaBdaId != undefined?this.rcfaBdaId:undefined));
            this.monitoringEmployeeList.push(response);
            await this.getMonitoringWeekList();
            if(this.component)
            this.component.forceUpdate();
            return true;
        }catch(e){
            console.log(e)
            return false;
        }finally{
            this.isSaveCurrence = false;
            location.reload();
        }
    }

    private problemDateChange = (event: any) => {
        this.problemDate = moment(this.getIsoDateFromWeirdMaterializeCssJQueryEvent(event)).toDate();     
    }


    private getIsoDateFromWeirdMaterializeCssJQueryEvent(weirdEvent: any): string {
        const eventData = (weirdEvent.originalEvent as any).firedBy;
        if (!eventData) return '';
        const date = eventData.date as Date | null;
        return date ? moment(date).format(ISO_SHORT_DATE_FORMAT) : '';
    }

    public SetClientForm = (form: RcfaBdaClientForm) => {
        this.rcfaBdaClientForm = form;
        if (form.Id){
            this.rcfaBdaId = form.Id;
        }
    }
    
    private initializeMaterial = () => {
        let fecha:Date = this.rcfaBdaClientForm.ProblemStartTimestamp ? 
                            moment(this.rcfaBdaClientForm.ProblemStartTimestamp).toDate()
                        :
                            new Date();

        const datePickerSettings = {
            defaultDate: "---",
            setDefaultDate: true,
            todayBtn: false,
            i18n: MATERIALIZE_SETTINGS.datepicker.i18n.spanish
        };
        ($('#bdaConcludedDate.datepicker') as any).datepicker(datePickerSettings);       

       
    };
}