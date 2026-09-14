import type { LibrarySample } from './types'
import s_account_executive from './samples/account-executive'
import s_analytics_engineer from './samples/analytics-engineer'
import s_android_engineer from './samples/android-engineer'
import s_application_security_engineer from './samples/application-security-engineer'
import s_audit_associate from './samples/audit-associate'
import s_bootcamp_graduate_data_analyst from './samples/bootcamp-graduate-data-analyst'
import s_brand_designer from './samples/brand-designer'
import s_brand_manager from './samples/brand-manager'
import s_business_analyst from './samples/business-analyst'
import s_business_intelligence_analyst from './samples/business-intelligence-analyst'
import s_career_changer_junior_developer from './samples/career-changer-junior-developer'
import s_chief_of_staff from './samples/chief-of-staff'
import s_clinical_dietitian from './samples/clinical-dietitian'
import s_clinical_pharmacist from './samples/clinical-pharmacist'
import s_clinical_research_associate from './samples/clinical-research-associate'
import s_communications_manager from './samples/communications-manager'
import s_compliance_officer from './samples/compliance-officer'
import s_content_marketing_specialist from './samples/content-marketing-specialist'
import s_contracts_manager from './samples/contracts-manager'
import s_corporate_ma_associate from './samples/corporate-ma-associate'
import s_corporate_tax_specialist from './samples/corporate-tax-specialist'
import s_corporate_trainer from './samples/corporate-trainer'
import s_customer_success_manager from './samples/customer-success-manager'
import s_customer_support_lead from './samples/customer-support-lead'
import s_data_analyst from './samples/data-analyst'
import s_data_engineer from './samples/data-engineer'
import s_data_scientist from './samples/data-scientist'
import s_database_administrator from './samples/database-administrator'
import s_design_manager from './samples/design-manager'
import s_digital_marketing_manager from './samples/digital-marketing-manager'
import s_director_of_strategy from './samples/director-of-strategy'
import s_electrical_design_engineer from './samples/electrical-design-engineer'
import s_elementary_school_teacher from './samples/elementary-school-teacher'
import s_embedded_software_engineer from './samples/embedded-software-engineer'
import s_engineering_manager from './samples/engineering-manager'
import s_final_year_engineering_student from './samples/final-year-engineering-student'
import s_finance_director from './samples/finance-director'
import s_financial_analyst from './samples/financial-analyst'
import s_financial_controller from './samples/financial-controller'
import s_frontend_engineer from './samples/frontend-engineer'
import s_full_stack_engineer from './samples/full-stack-engineer'
import s_graduate_structural_engineer from './samples/graduate-structural-engineer'
import s_graphic_designer from './samples/graphic-designer'
import s_head_of_data from './samples/head-of-data'
import s_head_of_intellectual_property from './samples/head-of-intellectual-property'
import s_head_of_operations from './samples/head-of-operations'
import s_healthcare_administrator from './samples/healthcare-administrator'
import s_hr_generalist from './samples/hr-generalist'
import s_industrial_designer from './samples/industrial-designer'
import s_instructional_designer from './samples/instructional-designer'
import s_internal_medicine_registrar from './samples/internal-medicine-registrar'
import s_investment_banking_analyst from './samples/investment-banking-analyst'
import s_ios_engineer from './samples/ios-engineer'
import s_junior_accounts_executive from './samples/junior-accounts-executive'
import s_legal_trainee from './samples/legal-trainee'
import s_lifecycle_marketing_lead from './samples/lifecycle-marketing-lead'
import s_litigation_associate from './samples/litigation-associate'
import s_litigation_paralegal from './samples/litigation-paralegal'
import s_logistics_coordinator from './samples/logistics-coordinator'
import s_machine_learning_engineer from './samples/machine-learning-engineer'
import s_management_consultant from './samples/management-consultant'
import s_manufacturing_engineer from './samples/manufacturing-engineer'
import s_manufacturing_engineering_manager from './samples/manufacturing-engineering-manager'
import s_mba_candidate from './samples/mba-candidate'
import s_mechanical_design_engineer from './samples/mechanical-design-engineer'
import s_mechanical_engineering_intern from './samples/mechanical-engineering-intern'
import s_medical_laboratory_technologist from './samples/medical-laboratory-technologist'
import s_motion_designer from './samples/motion-designer'
import s_new_graduate_business_analyst from './samples/new-graduate-business-analyst'
import s_office_manager from './samples/office-manager'
import s_performance_marketing_manager from './samples/performance-marketing-manager'
import s_phd_applicant_neuroscience from './samples/phd-applicant-neuroscience'
import s_physiotherapist from './samples/physiotherapist'
import s_postdoctoral_researcher from './samples/postdoctoral-researcher'
import s_postgraduate_research_associate from './samples/postgraduate-research-associate'
import s_procurement_specialist from './samples/procurement-specialist'
import s_product_designer from './samples/product-designer'
import s_product_manager from './samples/product-manager'
import s_product_marketing_manager from './samples/product-marketing-manager'
import s_program_manager from './samples/program-manager'
import s_qa_automation_engineer from './samples/qa-automation-engineer'
import s_quality_engineer from './samples/quality-engineer'
import s_quantitative_analyst from './samples/quantitative-analyst'
import s_radiologic_technologist from './samples/radiologic-technologist'
import s_recruiter from './samples/recruiter'
import s_registered_nurse from './samples/registered-nurse'
import s_risk_manager from './samples/risk-manager'
import s_sales_manager from './samples/sales-manager'
import s_school_leaver_apprenticeship from './samples/school-leaver-apprenticeship'
import s_school_principal from './samples/school-principal'
import s_secondary_physics_teacher from './samples/secondary-physics-teacher'
import s_senior_accountant from './samples/senior-accountant'
import s_senior_backend_engineer from './samples/senior-backend-engineer'
import s_senior_legal_counsel from './samples/senior-legal-counsel'
import s_senior_process_engineer from './samples/senior-process-engineer'
import s_senior_stress_engineer from './samples/senior-stress-engineer'
import s_seo_specialist from './samples/seo-specialist'
import s_site_reliability_engineer from './samples/site-reliability-engineer'
import s_social_media_manager from './samples/social-media-manager'
import s_special_education_teacher from './samples/special-education-teacher'
import s_supply_chain_analyst from './samples/supply-chain-analyst'
import s_treasury_analyst from './samples/treasury-analyst'
import s_ui_visual_designer from './samples/ui-visual-designer'
import s_university_lecturer from './samples/university-lecturer'
import s_ux_designer from './samples/ux-designer'
import s_ux_researcher from './samples/ux-researcher'
import s_warehouse_manager from './samples/warehouse-manager'
import s_water_resources_engineer from './samples/water-resources-engineer'

/**
 * Every sample in the library, in slug order.
 *
 * Generated by scripts/make-library-index.cjs — add a file under samples/ and
 * run it again rather than editing this list by hand.
 */
export const LIBRARY: readonly LibrarySample[] = [
  s_account_executive,
  s_analytics_engineer,
  s_android_engineer,
  s_application_security_engineer,
  s_audit_associate,
  s_bootcamp_graduate_data_analyst,
  s_brand_designer,
  s_brand_manager,
  s_business_analyst,
  s_business_intelligence_analyst,
  s_career_changer_junior_developer,
  s_chief_of_staff,
  s_clinical_dietitian,
  s_clinical_pharmacist,
  s_clinical_research_associate,
  s_communications_manager,
  s_compliance_officer,
  s_content_marketing_specialist,
  s_contracts_manager,
  s_corporate_ma_associate,
  s_corporate_tax_specialist,
  s_corporate_trainer,
  s_customer_success_manager,
  s_customer_support_lead,
  s_data_analyst,
  s_data_engineer,
  s_data_scientist,
  s_database_administrator,
  s_design_manager,
  s_digital_marketing_manager,
  s_director_of_strategy,
  s_electrical_design_engineer,
  s_elementary_school_teacher,
  s_embedded_software_engineer,
  s_engineering_manager,
  s_final_year_engineering_student,
  s_finance_director,
  s_financial_analyst,
  s_financial_controller,
  s_frontend_engineer,
  s_full_stack_engineer,
  s_graduate_structural_engineer,
  s_graphic_designer,
  s_head_of_data,
  s_head_of_intellectual_property,
  s_head_of_operations,
  s_healthcare_administrator,
  s_hr_generalist,
  s_industrial_designer,
  s_instructional_designer,
  s_internal_medicine_registrar,
  s_investment_banking_analyst,
  s_ios_engineer,
  s_junior_accounts_executive,
  s_legal_trainee,
  s_lifecycle_marketing_lead,
  s_litigation_associate,
  s_litigation_paralegal,
  s_logistics_coordinator,
  s_machine_learning_engineer,
  s_management_consultant,
  s_manufacturing_engineer,
  s_manufacturing_engineering_manager,
  s_mba_candidate,
  s_mechanical_design_engineer,
  s_mechanical_engineering_intern,
  s_medical_laboratory_technologist,
  s_motion_designer,
  s_new_graduate_business_analyst,
  s_office_manager,
  s_performance_marketing_manager,
  s_phd_applicant_neuroscience,
  s_physiotherapist,
  s_postdoctoral_researcher,
  s_postgraduate_research_associate,
  s_procurement_specialist,
  s_product_designer,
  s_product_manager,
  s_product_marketing_manager,
  s_program_manager,
  s_qa_automation_engineer,
  s_quality_engineer,
  s_quantitative_analyst,
  s_radiologic_technologist,
  s_recruiter,
  s_registered_nurse,
  s_risk_manager,
  s_sales_manager,
  s_school_leaver_apprenticeship,
  s_school_principal,
  s_secondary_physics_teacher,
  s_senior_accountant,
  s_senior_backend_engineer,
  s_senior_legal_counsel,
  s_senior_process_engineer,
  s_senior_stress_engineer,
  s_seo_specialist,
  s_site_reliability_engineer,
  s_social_media_manager,
  s_special_education_teacher,
  s_supply_chain_analyst,
  s_treasury_analyst,
  s_ui_visual_designer,
  s_university_lecturer,
  s_ux_designer,
  s_ux_researcher,
  s_warehouse_manager,
  s_water_resources_engineer,
]

/** One sample by its URL segment, or undefined when there is no such sample. */
export function getSample(slug: string | undefined): LibrarySample | undefined {
  return slug ? LIBRARY.find((s) => s.slug === slug) : undefined
}

/** Every slug, for the sitemap and the build's static pages. */
export function allSampleSlugs(): string[] {
  return LIBRARY.map((s) => s.slug)
}
