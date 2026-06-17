import type { Schema, Struct } from '@strapi/strapi';

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
      'navbar.dropdown': NavbarDropdown;
      'navbar.link': NavbarLink;
      'page.banner': PageBanner;
      'page.big-banner': PageBigBanner;
      'page.section': PageSection;
    }
  }
}
