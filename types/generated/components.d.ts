import type { Schema, Struct } from '@strapi/strapi';

export interface HallReservationsDaysOpen extends Struct.ComponentSchema {
  collectionName: 'components_hall_reservations_days_opens';
  info: {
    displayName: 'DaysOpen';
  };
  attributes: {
    friday: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    monday: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    saturday: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    sunday: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    thursday: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    tuesday: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    wednesday: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
  };
}

export interface HallReservationsHall extends Struct.ComponentSchema {
  collectionName: 'components_hall_reservations_halls';
  info: {
    displayName: 'Hall';
  };
  attributes: {
    confirmedCalendarId: Schema.Attribute.String & Schema.Attribute.Required;
    confirmedColor: Schema.Attribute.String & Schema.Attribute.Required;
    daysOpen: Schema.Attribute.Component<'hall-reservations.days-open', false>;
    earliestStartTime: Schema.Attribute.Time;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    note: Schema.Attribute.String;
    pendingCalendarId: Schema.Attribute.String & Schema.Attribute.Required;
    pendingColor: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavbarDropdown extends Struct.ComponentSchema {
  collectionName: 'components_navbar_dropdowns';
  info: {
    displayName: 'Dropdown';
  };
  attributes: {
    items: Schema.Attribute.Component<'navbar.link', true>;
    text: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'#'>;
  };
}

export interface NavbarLink extends Struct.ComponentSchema {
  collectionName: 'components_navbar_links';
  info: {
    displayName: 'Link';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageBanner extends Struct.ComponentSchema {
  collectionName: 'components_page_banners';
  info: {
    displayName: 'SmallBanner';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageBigBanner extends Struct.ComponentSchema {
  collectionName: 'components_page_big_banners';
  info: {
    displayName: 'BigBanner';
  };
  attributes: {
    boardSlogan: Schema.Attribute.String & Schema.Attribute.Required;
    img: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'> &
      Schema.Attribute.Required;
  };
}

export interface PageHallReservation extends Struct.ComponentSchema {
  collectionName: 'components_page_hall_reservations';
  info: {
    displayName: 'HallReservation';
  };
  attributes: {
    hall: Schema.Attribute.Component<'hall-reservations.hall', true>;
  };
}

export interface PageSection extends Struct.ComponentSchema {
  collectionName: 'components_page_sections';
  info: {
    displayName: 'Section';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'hall-reservations.days-open': HallReservationsDaysOpen;
      'hall-reservations.hall': HallReservationsHall;
      'navbar.dropdown': NavbarDropdown;
      'navbar.link': NavbarLink;
      'page.banner': PageBanner;
      'page.big-banner': PageBigBanner;
      'page.hall-reservation': PageHallReservation;
      'page.section': PageSection;
    }
  }
}
