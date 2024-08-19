import {observable, computed} from "mobx";
import IEmployee from "../../../../models/i-employee";
import EmployeeService from "../../../../services/employee-service"
import * as $ from 'jquery';
import RcfaBdaService from "../../../../services/rfca-bda-service";
import { RcfaBdaClientForm } from "../../../../models/rcfa-bda-form";
import { AxiosError } from "axios";
import { IModelStateError } from "../../../../models/i-model-state-error";
import DescriptionPage from "./bda-description-page";
import BoomAutocomplete from "../../../common/boom-autocomplete/boom-autocomplete";
import MaterializeUtil from "../../../common/materialize-util";
import {DATE_TIME_ISO_FORMAT, MATERIALIZE_SETTINGS} from "../../../../config/theme";
import * as moment from "moment";
import { ISO_SHORT_DATE_FORMAT } from "../../../../config/theme";
import UIAlertController from "../../../../lib/custom-dialogs/core/ui-alert-controller";
import { UIAlertControllerStyle } from "../../../../lib/custom-dialogs/core/ui-alert-controller-style";
import DialogRenderer from "../../../../lib/custom-dialogs/components/dialog-renderer/dialog-renderer";
import BoomDepartment from "../../../../models/boom-department";
import BoomWorkstation from "../../../../models/boom-workstation";
import BoomArea from "../../../../models/boom-area";
import BoomMachin from "../../../../models/boom-machine";
import {MEDIUM_TIME_FORMAT} from "../../../../config/theme";

import BoomFiltersState from "../../../../models/boom-filters-state"

export default class BdaDescriptionPageLogic {

    private employeeService: EmployeeService;
    private rcfaBdaService: RcfaBdaService;

    @observable
    public rcfaBdaClientForm: RcfaBdaClientForm = {...new RcfaBdaClientForm()}

    @observable
    public boomFiltersState: BoomFiltersState|null = null;

    @observable
    public OperatorEmployeeId: IEmployee[] = [];

    @observable
    public MechanicAssignedEmployee: IEmployee[] = [];
    
    @observable 
    public boomControl:BoomAutocomplete|null = null;

    @observable
    public modelStateErrors:IModelStateError|null = null;

    private problemDate:Date|null = null;

    @observable public problemTime:string = '';

    private get problemDateTime():string{
        if(this.problemDate)
        {
            return moment(MaterializeUtil.joinDateAndTime_hhmmA(this.problemDate || new Date, this.problemTime || moment().format('LT'))).format(DATE_TIME_ISO_FORMAT);
        }else{
            return '';
        }
    }

    constructor(rcfaBdaClientForm: RcfaBdaClientForm, private component:DescriptionPage, boomFiltersState:BoomFiltersState) {
        this.rcfaBdaClientForm = rcfaBdaClientForm;
        this.boomFiltersState = boomFiltersState;

        if (component.props.boomFilters.boomDepartment &&
            component.props.boomFilters.boomDepartment.length > 0) {
            let boomDepartment = component.props.boomFilters.boomDepartment[0];
            this.rcfaBdaClientForm.DepartmentId = boomDepartment.id;
            this.rcfaBdaClientForm.DepartmentName = boomDepartment.name;
        }

        if (component.props.boomFilters.boomWorkstation &&
            component.props.boomFilters.boomWorkstation.length > 0) {
            let boomWorkstation = component.props.boomFilters.boomWorkstation[0];
            this.rcfaBdaClientForm.WorkstationId = boomWorkstation.id;
            this.rcfaBdaClientForm.WorkstationName = boomWorkstation.name;
        }

        if (component.props.boomFilters.boomArea &&
            component.props.boomFilters.boomArea.length > 0) {
            let boomArea = component.props.boomFilters.boomArea[0];
            this.rcfaBdaClientForm.AreaId = boomArea.id;
            this.rcfaBdaClientForm.AreaName = boomArea.name;
        }

        if (component.props.boomFilters.boomMachine &&
            component.props.boomFilters.boomMachine.length > 0) {
            let boomMachine = component.props.boomFilters.boomMachine[0];
            this.rcfaBdaClientForm.MachineId = boomMachine.id;
            this.rcfaBdaClientForm.MachineName = boomMachine.name;
        }

        this.employeeService = new EmployeeService();
        this.rcfaBdaService = new RcfaBdaService();
    }

    public SetClientForm(form: RcfaBdaClientForm) {
        this.rcfaBdaClientForm = form;

        this.MechanicAssignedEmployee = [{
            id: this.rcfaBdaClientForm.MechanicAssignedEmployeeId || 0,
            name: this.rcfaBdaClientForm.MechanicAssignedEmployeeName || '',
            employeeNumber: this.rcfaBdaClientForm.MechanicAssignedEmployeeNumber || 0
        }];

        this.OperatorEmployeeId = [{
            id: this.rcfaBdaClientForm.OperatorEmployeeId || 0,
            name: this.rcfaBdaClientForm.OperatorEmployeeName || '',
            employeeNumber: this.rcfaBdaClientForm.OperatorEmployeeNumber || 0
        }];

        if(this.rcfaBdaClientForm.ProblemStartTimestamp){
            this.problemDate = moment(this.rcfaBdaClientForm.ProblemStartTimestamp).toDate();
            this.problemTime = moment(this.rcfaBdaClientForm.ProblemStartTimestamp).format(MEDIUM_TIME_FORMAT);
        }

        if(this.boomControl) {
            this.boomControl.SelectedDepartments.length = 0;
            this.boomControl.SelectedDepartments.push({
                id : this.rcfaBdaClientForm.DepartmentId || 0,
                name : this.rcfaBdaClientForm.DepartmentName || '',
                maintenanceTypeId: 0,
            });

            this.boomControl.SelectedWorkstations.length = 0;
            this.boomControl.SelectedWorkstations.push({
                id: this.rcfaBdaClientForm.WorkstationId || 0,
                name: this.rcfaBdaClientForm.WorkstationName || ''
            });

            this.boomControl.SelectedAreas.length = 0;
            this.boomControl.SelectedAreas.push({
                id: this.rcfaBdaClientForm.AreaId || 0,
                departmentId: this.rcfaBdaClientForm.DepartmentId || 0,
                name: this.rcfaBdaClientForm.AreaName || ''
            });

            this.boomControl.SelectedMachines.length = 0;
            this.boomControl.SelectedMachines.push({
                id: this.rcfaBdaClientForm.MachineId || 0,
                areaId: this.rcfaBdaClientForm.AreaId || 0,
                name: this.rcfaBdaClientForm.MachineName || ''
            });
        }

        ($('select.material-opt-in') as any).formSelect();
        ($('select.material-opt-in') as any).formSelect();

        ($('.inputActive') as any).addClass('active');

        this.component.forceUpdate();
    }

    public async onComponentDidMount() {
        try {
            this.initializeMaterial();
            this.fillDataBoomState();
        } catch (error) {
            //ignore
        }
    };

    public handleOperatorEmployeeIdChange = (event: any) => {
        this.rcfaBdaClientForm.OperatorEmployeeId = event[0].id;
    };

    public handleMechanicAssignedEmployeeIdChange = (event: any) => {
        this.rcfaBdaClientForm.MechanicAssignedEmployeeId = event[0].id;
    };

    public handleTotalFalureTimeHoursChange =(event: React.ChangeEvent<HTMLSelectElement>)=>{
        this.rcfaBdaClientForm.TotalFalureTimeHours = parseInt(event.target.value);
    }

    public handleTotalFalureTimeMinutesChange =(event: React.ChangeEvent<HTMLSelectElement>)=>{
        this.rcfaBdaClientForm.TotalFalureTimeMinutes = parseInt(event.target.value);
    }

    public onBoomDepartmentChange = (selection: BoomDepartment[]) => {
        this.rcfaBdaClientForm.DepartmentId = selection[0].id;
    };

    public onBoomWorkstationChange = (selection: BoomWorkstation[]) => {
        this.rcfaBdaClientForm.WorkstationId = selection[0].id;
    };

    public onBoomAreaChange = (selection: BoomArea[]) => {
        this.rcfaBdaClientForm.AreaId = selection[0].id;
    };

    public onBoomMachineChange = (selection: BoomMachin[]) => {
        this.rcfaBdaClientForm.MachineId = selection[0].id;
    };

    private getAxiosError(error: Error): AxiosError {
        return error as AxiosError;
    }

    private initializeMaterial = () => {
        let datePickerSettingsProblem = {
            maxDate: new Date(),
            setDefaultDate: true,
            defaultDate: new Date()
        };

        $('#BdaProblemStartDate.datepicker').on('change', this.problemDateChange).datepicker(datePickerSettingsProblem);
        $('#BdaProblemStartTime.timepicker').on('change', this.problemTimeChange).timepicker(datePickerSettingsProblem);

        $("#ReportTime_lbl").addClass('active');
        ($('.tabs')as any).tabs({onShow: () => { this.component.forceUpdate() } });
        ($('.modal')as any).modal();
        ($('select.material-opt-in') as any).formSelect();
    };

    public getEmployeeLabel = (employee: IEmployee) => {
        return `#(${employee.employeeNumber}) ${employee.name}`;
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
    
    private problemDateChange = (event: any) => {
        this.problemDate = moment(this.getIsoDateFromWeirdMaterializeCssJQueryEvent(event)).toDate();
        this.rcfaBdaClientForm.ProblemStartTimestamp = this.problemDateTime;       
    }

    private problemTimeChange = (event: any) => {
        this.problemTime = event.currentTarget.value;
        this.rcfaBdaClientForm.ProblemStartTimestamp = this.problemDateTime;

    }

    private getIsoDateFromWeirdMaterializeCssJQueryEvent(weirdEvent: any): string {
        const eventData = (weirdEvent.originalEvent as any).firedBy;
        if (!eventData) return '';
        const date = eventData.date as Date | null;
        return date ? moment(date).format(ISO_SHORT_DATE_FORMAT) : '';
    }

    public handleFormSubmit = async (changeState:boolean) => {
        const controller = new UIAlertController<void>("Aviso", "Se están procesando los datos", UIAlertControllerStyle.alert);
        const closeBlocker = DialogRenderer.PresentBlocker(controller);
        
        if (this.problemDateTime) {
            this.rcfaBdaClientForm.ProblemStartTimestamp = this.problemDateTime;
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

    private fillDataBoomState = async () => {
        if(this.boomFiltersState){
            if(this.boomControl) {
                if(this.boomFiltersState.boomDepartment && 
                   this.boomFiltersState.boomDepartment.length > 0){
                    this.boomControl.SelectedDepartments.length = 0;
                    this.boomControl.SelectedDepartments.push({
                        id : this.boomFiltersState.boomDepartment[0].id,
                        name :  this.boomFiltersState.boomDepartment[0].name,
                        maintenanceTypeId: this.boomFiltersState.boomDepartment[0].maintenanceTypeId
                    });
                }

                if(this.boomFiltersState.boomArea && 
                   this.boomFiltersState.boomArea.length > 0){
                    this.boomControl.SelectedAreas.length = 0;
                    this.boomControl.SelectedAreas.push({
                        id : this.boomFiltersState.boomArea[0].id,
                        name :  this.boomFiltersState.boomArea[0].name,
                        departmentId: this.boomFiltersState.boomArea[0].departmentId
                    });
                }

                if(this.boomFiltersState.boomWorkstation && 
                   this.boomFiltersState.boomWorkstation.length > 0){
                    this.boomControl.SelectedWorkstations.length = 0;
                    this.boomControl.SelectedWorkstations.push({
                        id : this.boomFiltersState.boomWorkstation[0].id,
                        name :  this.boomFiltersState.boomWorkstation[0].name
                    });
                }

                if(this.boomFiltersState.boomMachine && 
                   this.boomFiltersState.boomMachine.length > 0){
                    this.boomControl.SelectedMachines.length = 0;
                    this.boomControl.SelectedMachines.push({
                        id : this.boomFiltersState.boomMachine[0].id,
                        name :  this.boomFiltersState.boomMachine[0].name,
                        areaId: this.boomFiltersState.boomMachine[0].areaId
                    });
                }

            }
        }
    }
}