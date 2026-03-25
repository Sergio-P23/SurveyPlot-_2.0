import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsolidadoPage } from './consolidado.page';

describe('ConsolidadoPage', () => {
  let component: ConsolidadoPage;
  let fixture: ComponentFixture<ConsolidadoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsolidadoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
